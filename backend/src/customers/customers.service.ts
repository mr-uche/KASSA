import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwner(userId: string, businessId: string) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { role: { select: { name: true } } },
    });
    if (!membership || membership.role.name !== 'Owner') {
      throw new ForbiddenException('Only business owners may access customer records at this stage');
    }
  }

  private normalizedName(value: string): string {
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name) throw new BadRequestException('Customer full name is required');
    return name;
  }

  private normalizedPhone(value: string): string {
    const phone = value.trim();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      throw new BadRequestException('Customer phone must contain 7–15 digits');
    }
    return phone;
  }

  async list(userId: string, businessId: string) {
    await this.requireOwner(userId, businessId);
    // Customer records belong to a business, not a branch. Paid sales provide purchase counts.
    const [customers, purchases] = await Promise.all([
      this.prisma.customer.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { businessId, customerId: { not: null }, status: 'PAID' },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
    ]);
    const totals = new Map(
      purchases.map((row) => [
        row.customerId,
        { count: row._count._all, lastPurchase: row._max.createdAt },
      ] as const),
    );
    return customers.map((customer) => ({
      id: customer.id,
      businessId: customer.businessId,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      purchases: totals.get(customer.id)?.count ?? 0,
      lastPurchase: totals.get(customer.id)?.lastPurchase?.toISOString() ?? null,
    }));
  }

  async one(userId: string, businessId: string, customerId: string) {
    await this.requireOwner(userId, businessId);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });
    if (!customer) throw new NotFoundException('Customer not found in your business');
    return customer;
  }

  async create(userId: string, dto: CreateCustomerDto) {
    await this.requireOwner(userId, dto.businessId);
    const customer = await this.prisma.customer.create({
      data: {
        businessId: dto.businessId,
        fullName: this.normalizedName(dto.fullName),
        phone: this.normalizedPhone(dto.phone),
        email: dto.email?.trim().toLowerCase() || null,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
    return { ...customer, purchases: 0, lastPurchase: null };
  }

  async update(userId: string, customerId: string, dto: UpdateCustomerDto) {
    await this.requireOwner(userId, dto.businessId);
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId: dto.businessId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Customer not found in your business');

    const data: {
      fullName?: string;
      phone?: string;
      email?: string | null;
      address?: string | null;
      notes?: string | null;
    } = {};
    if (dto.fullName !== undefined) data.fullName = this.normalizedName(dto.fullName);
    if (dto.phone !== undefined) data.phone = this.normalizedPhone(dto.phone);
    if (dto.email !== undefined) data.email = dto.email?.trim().toLowerCase() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (!Object.keys(data).length) throw new BadRequestException('No customer changes provided');

    // All fields are restricted to the customer in the caller's business.
    return this.prisma.customer.update({ where: { id: existing.id }, data });
  }
}
