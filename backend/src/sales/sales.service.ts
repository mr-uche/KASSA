import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { requireBusinessPermission } from '../business-access';
import { ConfirmCashDto, CreateSaleDto, SalesListQueryDto } from './dto/sales.dto';

function toKobo(value: string): bigint {
  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value)) throw new BadRequestException('Invalid product price');
  const [naira, fraction = ''] = value.split('.');
  return BigInt(naira) * 100n + BigInt(fraction.padEnd(2, '0'));
}
function money(value: bigint): string {
  return (value / 100n).toString() + '.' + (value % 100n).toString().padStart(2, '0');
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    cashier: { select: { fullName: true } },
    customer: { select: { fullName: true } },
    items: { select: {
      id: true, productId: true, productNameSnapshot: true, quantity: true, unitPrice: true, lineTotal: true,
    } },
    payments: { select: { id: true, reference: true, channel: true, status: true, confirmedAt: true } },
  } as const;

  private async checkAccess(userId: string, businessId: string, branchId: string, writing = false) {
    await requireBusinessPermission(
      this.prisma, userId, businessId, 'Manage sales & transactions', branchId,
    );
  }

  private serialize(sale: {
    id: string; reference: string; businessId: string; branchId: string; status: string;
    subtotal: { toString(): string }; discount: { toString(): string }; total: { toString(): string };
    currency: string; createdAt: Date; cashier: { fullName: string } | null;
    customerId: string | null; customer: { fullName: string } | null;
    items: { id: string; productId: string; productNameSnapshot: string; quantity: number; unitPrice: { toString(): string }; lineTotal: { toString(): string } }[];
    payments: { id: string; reference: string; channel: string; status: string; confirmedAt: Date | null }[];
  }) {
    return {
      id: sale.id, reference: sale.reference, businessId: sale.businessId, branchId: sale.branchId,
      status: sale.status, subtotal: sale.subtotal.toString(), discount: sale.discount.toString(),
      total: sale.total.toString(), currency: sale.currency, createdAt: sale.createdAt.toISOString(),
      cashier: sale.cashier?.fullName ?? 'Business owner',
      customerId: sale.customerId, customer: sale.customer?.fullName ?? 'Walk-in customer',
      items: sale.items.map((item) => ({
        id: item.id, productId: item.productId, name: item.productNameSnapshot,
        quantity: item.quantity, unitPrice: item.unitPrice.toString(), lineTotal: item.lineTotal.toString(),
      })),
      payments: sale.payments.map((payment) => ({
        id: payment.id, reference: payment.reference, channel: payment.channel,
        status: payment.status, confirmedAt: payment.confirmedAt?.toISOString() ?? null,
      })),
    };
  }

  async create(userId: string, dto: CreateSaleDto) {
    await this.checkAccess(userId, dto.businessId, dto.branchId, true);
    const ids = dto.items.map((line) => line.productId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate product in sale');
    const reference = 'KSA-' + dto.clientRequestId.replace(/-/g, '');
    const existing = await this.prisma.sale.findUnique({ where: { reference }, include: this.include });
    if (existing) {
      if (existing.businessId !== dto.businessId || existing.branchId !== dto.branchId ||
          existing.payments[0]?.channel !== dto.channel || existing.items.length !== dto.items.length ||
          existing.customerId !== (dto.customerId ?? null) ||
          dto.items.some((line) => !existing.items.some((item) =>
            line.productId === item.productId && line.quantity === item.quantity))) {
        throw new ConflictException('This request ID belongs to another sale');
      }
      return this.serialize(existing);
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, businessId: dto.businessId }, select: { id: true },
      });
      if (!customer) throw new BadRequestException('Customer not found in this business');
    }
    const products = await this.prisma.product.findMany({
      where: { businessId: dto.businessId, id: { in: ids } },
      select: { id: true, name: true, sellingPrice: true, stock: {
        where: { branchId: dto.branchId }, select: { quantity: true },
      } },
    });
    if (products.length !== ids.length) throw new BadRequestException('Product not found in this business');
    const productMap = new Map(products.map((product) => [product.id, product]));
    const lines = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException('Product not found');
      if ((product.stock[0]?.quantity ?? 0) < item.quantity)
        throw new ConflictException('Insufficient stock for ' + product.name);
      const unitPrice = toKobo(product.sellingPrice.toString());
      return {
        productId: product.id, productNameSnapshot: product.name,
        quantity: item.quantity, unitPrice: money(unitPrice),
        lineTotal: money(unitPrice * BigInt(item.quantity)),
        totalKobo: unitPrice * BigInt(item.quantity),
      };
    });
    const totalKobo = lines.reduce((sum, item) => sum + item.totalKobo, 0n);
    if (totalKobo <= 0n || totalKobo > 99_999_999_999_999n)
      throw new BadRequestException('Sale total outside supported range');
    const total = money(totalKobo);
    try {
      const sale = await this.prisma.sale.create({
        data: {
          reference, businessId: dto.businessId, branchId: dto.branchId,
          cashierId: userId, customerId: dto.customerId ?? null,
          status: 'PENDING_PAYMENT', subtotal: total, discount: '0.00', total,
          items: { create: lines.map((line) => ({
            productId: line.productId, productNameSnapshot: line.productNameSnapshot,
            quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal,
          })) },
          payments: { create: {
            reference: 'PAY-' + randomUUID(), businessId: dto.businessId,
            channel: dto.channel, status: 'PENDING', amount: total,
          } },
        },
        include: this.include,
      });
      return this.serialize(sale);
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('Duplicate sale request. Check transactions before retrying.');
      }
      throw error;
    }
  }

  async list(userId: string, query: SalesListQueryDto) {
    await this.checkAccess(userId, query.businessId, query.branchId);
    const sales = await this.prisma.sale.findMany({
      where: { businessId: query.businessId, branchId: query.branchId },
      include: this.include, orderBy: { createdAt: 'desc' }, take: 100,
    });
    return sales.map((sale) => this.serialize(sale));
  }

  async getOne(userId: string, id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: this.include });
    if (!sale) throw new NotFoundException('Sale not found');
    await this.checkAccess(userId, sale.businessId, sale.branchId);
    return this.serialize(sale);
  }

  async confirmCash(userId: string, id: string, dto: ConfirmCashDto) {
    if (dto.cashReceived !== true) throw new BadRequestException('Confirm that physical cash was received');
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: this.include });
    if (!sale) throw new NotFoundException('Sale not found');
    await this.checkAccess(userId, sale.businessId, sale.branchId, true);
    if (sale.status === 'PAID' && sale.payments.some((p) => p.channel === 'CASH' && p.status === 'SUCCEEDED')) {
      return this.serialize(sale);
    }
    if (sale.status !== 'PENDING_PAYMENT' || sale.payments.length !== 1 ||
        sale.payments[0].channel !== 'CASH' || sale.payments[0].status !== 'PENDING')
      throw new ConflictException('Only pending cash sales can be confirmed here');

    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.sale.updateMany({
        where: { id: sale.id, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' },
      });
      if (claim.count !== 1) throw new ConflictException('Sale is already being processed');
      // Lock stock balance rows in a stable order when concurrent sales share products.
      for (const item of [...sale.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
        const stock = await tx.stockBalance.updateMany({
          where: { productId: item.productId, branchId: sale.branchId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (stock.count !== 1) throw new ConflictException('Insufficient stock for ' + item.productNameSnapshot);
        await tx.stockMovement.create({
          data: { productId: item.productId, branchId: sale.branchId,
            delta: -item.quantity, reason: 'SALE', reference: sale.reference },
        });
      }
      await tx.payment.update({
        where: { id: sale.payments[0].id },
        data: { status: 'SUCCEEDED', confirmedAt: new Date() },
      });
    });
    return this.getOne(userId, id);
  }
}
