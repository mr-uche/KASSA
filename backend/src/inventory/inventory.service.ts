import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CategoryCreateDto, InventoryScopeQueryDto, ProductCreateDto, RestockDto,
} from './dto/inventory.dto';

function stockStatus(quantity: number, threshold: number) {
  if (quantity === 0) return 'Out of stock';
  return quantity <= threshold ? 'Low stock' : 'In stock';
}

// Currency values arrive as validated decimal strings; calculate stock cost in integer kobo.
function toKobo(amount: string): bigint {
  const [naira, fraction = ''] = amount.split('.');
  return BigInt(naira) * 100n + BigInt(fraction.padEnd(2, '0'));
}
function fromKobo(amount: bigint): string {
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, '0')}`;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireMembership(userId: string, businessId: string, write = false) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { branchId: true, role: { select: { name: true } } },
    });
    if (!membership) throw new ForbiddenException('You do not belong to this business');
    if (write && membership.role.name !== 'Owner') {
      throw new ForbiddenException('Only business owners can manage inventory at this stage');
    }
    return membership;
  }

  private async requireBranch(userId: string, businessId: string, branchId: string, write = false) {
    const membership = await this.requireMembership(userId, businessId, write);
    if (membership.role.name !== 'Owner' && membership.branchId !== branchId) {
      throw new ForbiddenException('You cannot access another branch');
    }
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, businessId, isActive: true },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Active branch not found in this business');
  }

  async listCategories(userId: string, query: InventoryScopeQueryDto) {
    await this.requireBranch(userId, query.businessId, query.branchId);
    const categories = await this.prisma.category.findMany({
      where: { businessId: query.businessId },
      include: {
        products: {
          select: {
            costPrice: true,
            stock: {
              where: { branchId: query.branchId },
              select: { quantity: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return categories.map((category) => {
      const stockCostKobo = category.products.reduce((sum, product) => {
        const quantity = product.stock[0]?.quantity ?? 0;
        return sum + (product.costPrice ? toKobo(product.costPrice.toString()) * BigInt(quantity) : 0n);
      }, 0n);
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        products: category.products.length,
        stockValue: fromKobo(stockCostKobo),
        status: category.isActive ? 'Active' : 'Inactive',
      };
    });
  }

  async createCategory(userId: string, dto: CategoryCreateDto) {
    await this.requireMembership(userId, dto.businessId, true);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Enter a category name');
    try {
      return await this.prisma.category.create({
        data: {
          businessId: dto.businessId,
          name,
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        select: { id: true, name: true, description: true, isActive: true },
      });
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A category with this name already exists');
      }
      throw error;
    }
  }

  async listProducts(userId: string, query: InventoryScopeQueryDto) {
    await this.requireBranch(userId, query.businessId, query.branchId);
    const products = await this.prisma.product.findMany({
      where: { businessId: query.businessId },
      include: {
        category: { select: { name: true } },
        stock: { where: { branchId: query.branchId }, select: { quantity: true } },
      },
      orderBy: { name: 'asc' },
    });
    return products.map((product) => {
      const quantity = product.stock[0]?.quantity ?? 0;
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        category: product.category?.name ?? 'Uncategorised',
        price: product.sellingPrice.toString(),
        costPrice: product.costPrice?.toString() ?? null,
        stock: quantity,
        lowStockThreshold: product.lowStockThreshold,
        status: stockStatus(quantity, product.lowStockThreshold),
      };
    });
  }

  async createProduct(userId: string, dto: ProductCreateDto) {
    await this.requireBranch(userId, dto.businessId, dto.branchId, true);
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, businessId: dto.businessId, isActive: true },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Choose an active category from this business');
    if (!dto.name.trim() || !dto.sku.trim()) {
      throw new BadRequestException('Product name and SKU are required');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            businessId: dto.businessId,
            categoryId: category.id,
            name: dto.name.trim(),
            sku: dto.sku.trim(),
            brand: dto.brand?.trim() || null,
            unit: dto.unit?.trim() || null,
            description: dto.description?.trim() || null,
            sellingPrice: dto.sellingPrice,
            costPrice: dto.costPrice ?? null,
            lowStockThreshold: dto.lowStockThreshold,
          },
          select: { id: true, name: true, sku: true },
        });
        await tx.stockBalance.create({
          data: { productId: product.id, branchId: dto.branchId, quantity: dto.currentStock },
        });
        if (dto.currentStock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              branchId: dto.branchId,
              delta: dto.currentStock,
              reason: 'INITIAL_STOCK',
            },
          });
        }
        return { ...product, currentStock: dto.currentStock, message: 'Product saved to the catalogue' };
      });
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A product with this SKU already exists in the business');
      }
      throw error;
    }
  }

  async restock(userId: string, productId: string, dto: RestockDto) {
    await this.requireBranch(userId, dto.businessId, dto.branchId, true);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId: dto.businessId },
      select: { id: true, name: true, lowStockThreshold: true },
    });
    if (!product) throw new NotFoundException('Product not found in this business');

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.stockBalance.upsert({
        where: { productId_branchId: { productId: product.id, branchId: dto.branchId } },
        create: { productId: product.id, branchId: dto.branchId, quantity: dto.quantity },
        update: { quantity: { increment: dto.quantity } },
        select: { quantity: true },
      });
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          branchId: dto.branchId,
          delta: dto.quantity,
          reason: 'RESTOCK',
          reference: dto.supplierRef?.trim() || null,
          note: dto.note?.trim() || null,
        },
      });
      return {
        id: product.id,
        name: product.name,
        added: dto.quantity,
        stock: balance.quantity,
        status: stockStatus(balance.quantity, product.lowStockThreshold),
      };
    });
  }
}
