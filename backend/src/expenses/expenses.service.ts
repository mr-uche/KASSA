import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/expenses.dto';

type ReceiptUpload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwner(userId: string, businessId: string) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { role: { select: { name: true } } },
    });
    if (membership?.role.name !== 'Owner') {
      throw new ForbiddenException('Only business owners can view or manage expenses');
    }
  }

  async list(userId: string, businessId: string, branchId?: string, month?: string) {
    await this.requireOwner(userId, businessId);
    if (branchId) await this.requireBranch(businessId, branchId);
    const where = { businessId, ...(branchId ? { branchId } : {}) };
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const selectedMonth = month ?? now.toISOString().slice(0, 7);
    const [selectedYear, selectedNumber] = selectedMonth === 'all'
      ? [0, 0] : selectedMonth.split('-').map(Number);
    const selectedWhere = selectedMonth === 'all' ? where : {
      ...where,
      spentAt: {
        gte: new Date(Date.UTC(selectedYear, selectedNumber - 1, 1)),
        lt: new Date(Date.UTC(selectedYear, selectedNumber, 1)),
      },
    };
    const [records, allTime, thisMonth, categories, selectedTotal, selectedCategories] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: [{ spentAt: 'desc' }, { createdAt: 'desc' }],
        take: 500,
        select: {
          id: true, businessId: true, branchId: true, amount: true,
          category: true, description: true, spentAt: true, createdAt: true,
          receiptName: true, receiptMime: true,
          branch: { select: { name: true } },
        },
      }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
      this.prisma.expense.aggregate({
        where: { ...where, spentAt: { gte: monthStart } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['category'], where,
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: selectedWhere, _sum: { amount: true }, _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['category'], where: selectedWhere, _sum: { amount: true },
      }),
    ]);
    return {
      items: records.map(({ branch, ...row }) => ({
        ...row, amount: row.amount.toString(),
        spentAt: row.spentAt.toISOString().slice(0, 10),
        branchName: branch.name,
        hasReceipt: Boolean(row.receiptName),
      })),
      summary: {
        allTime: allTime._sum.amount?.toString() ?? '0.00',
        thisMonth: thisMonth._sum.amount?.toString() ?? '0.00',
        count: allTime._count,
        monthCount: thisMonth._count,
        // Exact aggregate for the selected month, including older records
        // beyond the 500 rows returned in the recent-expenses list.
        periodMonth: selectedMonth,
        periodTotal: selectedTotal._sum.amount?.toString() ?? '0.00',
        periodCount: selectedTotal._count,
        byCategoryForPeriod: selectedCategories.map(row => ({
          category: row.category, amount: row._sum.amount?.toString() ?? '0.00',
        })),
        byCategory: categories.map(row => ({
          category: row.category, amount: row._sum.amount?.toString() ?? '0.00',
        })),
      },
      historyLimit: 500,
    };
  }

  private async requireBranch(businessId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, businessId, isActive: true }, select: { id: true },
    });
    if (!branch) throw new NotFoundException('Active branch not found in your business');
  }

  async create(userId: string, dto: CreateExpenseDto) {
    await this.requireOwner(userId, dto.businessId);
    await this.requireBranch(dto.businessId, dto.branchId);
    const description = dto.description.trim();
    if (!description) throw new BadRequestException('Expense description is required');
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than zero');
    }
    const spentAt = new Date(dto.spentAt + 'T00:00:00.000Z');
    if (Number.isNaN(spentAt.valueOf()) || spentAt.toISOString().slice(0, 10) !== dto.spentAt) {
      throw new BadRequestException('Enter a valid expense date');
    }
    const row = await this.prisma.expense.create({
      data: {
        businessId: dto.businessId, branchId: dto.branchId,
        createdById: userId, amount: dto.amount, category: dto.category,
        description, spentAt,
      },
      select: { id: true },
    });
    return row;
  }

  private async owned(userId: string, businessId: string, expenseId: string) {
    await this.requireOwner(userId, businessId);
    const row = await this.prisma.expense.findFirst({
      where: { id: expenseId, businessId },
    });
    if (!row) throw new NotFoundException('Expense not found in your business');
    return row;
  }

  async attachReceipt(userId: string, businessId: string, expenseId: string, file?: ReceiptUpload) {
    await this.owned(userId, businessId, expenseId);
    if (!file?.buffer?.length || file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Select a receipt file up to 2 MB');
    }
    const bytes = file.buffer;
    const mime = bytes.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' :
      bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' :
      bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' :
      bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' &&
        bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
    if (!mime) throw new BadRequestException('Receipt must be a PDF, PNG, JPEG or WebP file');
    const name = (file.originalname || 'receipt').replace(/[^\w. -]/g, '_').slice(0, 150);
    await this.prisma.expense.update({
      where: { id: expenseId },
      data: { receiptName: name, receiptMime: mime, receiptData: new Uint8Array(bytes) },
    });
    return { saved: true, receiptName: name };
  }

  async receipt(userId: string, businessId: string, expenseId: string) {
    const row = await this.owned(userId, businessId, expenseId);
    if (!row.receiptData || !row.receiptName || !row.receiptMime) {
      throw new NotFoundException('No receipt is attached to this expense');
    }
    return {
      name: row.receiptName, mime: row.receiptMime,
      bytes: Buffer.from(row.receiptData),
    };
  }
}
