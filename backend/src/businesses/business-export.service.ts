import {
  ForbiddenException, Injectable, PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportBusinessDto } from './dto/export-business.dto';

// Fail rather than silently download incomplete financial records.
// An advanced streamed/batched export can replace this limit later.
const MAX_ROWS_PER_SECTION = 5000;

type CsvCell = string | number | boolean | null;
type Dataset = { key: string; title: string; columns: string[]; rows: CsvCell[][] };

const iso = (value: Date | null | undefined) => value?.toISOString() ?? '';
const str = (value: unknown) => value == null ? '' : String(value);

@Injectable()
export class BusinessExportService {
  constructor(private readonly prisma: PrismaService) {}

  async export(userId: string, businessId: string, dto: ExportBusinessDto) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { role: { select: { name: true } } },
    });
    if (membership?.role.name !== 'Owner') {
      throw new ForbiddenException('Only the business owner can export business data');
    }

    const now = new Date();
    const dateRange = dto.dateRange ?? 'ALL';
    const from = dateRange === 'LAST_30_DAYS' ? new Date(now.getTime() - 30 * 86400000)
      : dateRange === 'LAST_90_DAYS' ? new Date(now.getTime() - 90 * 86400000)
      : dateRange === 'THIS_YEAR' ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
      : null;
    const recent = from ? { createdAt: { gte: from, lte: now } } : {};
    const datasets: Dataset[] = [];
    const ensure = (n: number, section: string) => {
      if (n > MAX_ROWS_PER_SECTION) {
        throw new PayloadTooLargeException(
          section + ' exceeds the 5000-record download limit. Narrow the date range or contact support for a complete archive.',
        );
      }
    };

    for (const key of new Set(dto.sections)) {
      if (key === 'transactions') {
        const sales = await this.prisma.sale.findMany({
          where: { businessId, ...recent },
          orderBy: { createdAt: 'desc' }, take: MAX_ROWS_PER_SECTION + 1,
          select: {
            reference: true, status: true, total: true, subtotal: true, discount: true,
            currency: true, createdAt: true,
            branch: { select: { name: true } },
            cashier: { select: { fullName: true } },
            customer: { select: { fullName: true } },
            payments: { select: {
              reference: true, channel: true, status: true, amount: true,
              provider: true, providerReference: true, confirmedAt: true,
            } },
          },
        });
        ensure(sales.length, 'Transactions');
        datasets.push({
          key, title: 'Transactions',
          columns: ['Sale reference', 'Created at (UTC)', 'Branch', 'Customer', 'Cashier',
            'Sale status', 'Subtotal (NGN)', 'Discount (NGN)', 'Total (NGN)', 'Currency',
            'Payment reference', 'Payment channel', 'Payment status', 'Provider',
            'Provider reference', 'Payment amount (NGN)', 'Confirmed at (UTC)', 'Is test'],
          rows: sales.map((sale) => {
            const payment = sale.payments[0];
            return [
              sale.reference, iso(sale.createdAt), sale.branch.name, sale.customer?.fullName ?? '',
              sale.cashier?.fullName ?? '', sale.status, str(sale.subtotal), str(sale.discount),
              str(sale.total), sale.currency, payment?.reference ?? '', payment?.channel ?? '',
              payment?.status ?? '', payment?.provider ?? '', payment?.providerReference ?? '',
              str(payment?.amount), iso(payment?.confirmedAt), payment?.provider === 'PAYSTACK_TEST',
            ];
          }),
        });
      }

      if (key === 'productsInventory') {
        const products = await this.prisma.product.findMany({
          where: { businessId }, orderBy: { name: 'asc' }, take: MAX_ROWS_PER_SECTION + 1,
          select: {
            name: true, sku: true, barcode: true, brand: true, unit: true,
            sellingPrice: true, costPrice: true, lowStockThreshold: true,
            category: { select: { name: true } },
            stock: { select: { quantity: true, branch: { select: { name: true } } } },
          },
        });
        ensure(products.length, 'Products & Inventory');
        const rows = products.flatMap((product) =>
          (product.stock.length ? product.stock : [{ quantity: 0, branch: { name: 'No branch stock' } }])
            .map((entry) => [
              product.sku, product.barcode ?? '', product.name, product.category?.name ?? '',
              product.brand ?? '', product.unit ?? '', str(product.sellingPrice),
              str(product.costPrice), product.lowStockThreshold,
              entry.branch.name, entry.quantity,
            ] as CsvCell[]),
        );
        ensure(rows.length, 'Product stock rows');
        datasets.push({
          key, title: 'Products & Inventory',
          columns: ['SKU', 'Barcode', 'Name', 'Category', 'Brand', 'Unit', 'Selling price (NGN)',
            'Cost price (NGN)', 'Low stock threshold', 'Branch', 'Stock quantity'],
          rows,
        });
      }

      if (key === 'customers') {
        const customers = await this.prisma.customer.findMany({
          where: { businessId, ...recent }, orderBy: { createdAt: 'desc' },
          take: MAX_ROWS_PER_SECTION + 1,
          select: {
            fullName: true, email: true, phone: true, address: true,
            notes: true, createdAt: true,
          },
        });
        ensure(customers.length, 'Customers');
        datasets.push({
          key, title: 'Customers', columns: ['Name', 'Email', 'Phone', 'Address', 'Notes', 'Created at (UTC)'],
          rows: customers.map((c) => [
            c.fullName, c.email ?? '', c.phone ?? '', c.address ?? '', c.notes ?? '',
            iso(c.createdAt),
          ]),
        });
      }

      if (key === 'staff') {
        const members = await this.prisma.businessMembership.findMany({
          where: { businessId }, orderBy: { createdAt: 'desc' },
          take: MAX_ROWS_PER_SECTION + 1,
          select: {
            createdAt: true, user: { select: { fullName: true, email: true, phone: true } },
            role: { select: { name: true } },
            branch: { select: { name: true } },
          },
        });
        ensure(members.length, 'Staff');
        datasets.push({
          key, title: 'Staff', columns: ['Name', 'Email', 'Phone', 'Role', 'Assigned branch', 'Joined at (UTC)'],
          rows: members.map((m) => [
            m.user.fullName, m.user.email, m.user.phone ?? '',
            m.role.name, m.branch?.name ?? 'All branches', iso(m.createdAt),
          ]),
        });
      }

      if (key === 'branches') {
        const branches = await this.prisma.branch.findMany({
          where: { businessId }, orderBy: { createdAt: 'asc' },
          take: MAX_ROWS_PER_SECTION + 1,
          select: {
            name: true, code: true, address: true, city: true, state: true,
            phone: true, isActive: true, createdAt: true,
          },
        });
        ensure(branches.length, 'Branches');
        datasets.push({
          key, title: 'Branches', columns: ['Name', 'Code', 'Address', 'City', 'State',
            'Phone', 'Active', 'Created at (UTC)'],
          rows: branches.map((b) => [
            b.name, b.code ?? '', b.address ?? '', b.city ?? '', b.state ?? '',
            b.phone ?? '', b.isActive, iso(b.createdAt),
          ]),
        });
      }

      if (key === 'reportsAnalytics') {
        const [total, paid, pending, test] = await Promise.all([
          this.prisma.sale.count({ where: { businessId, ...recent } }),
          this.prisma.sale.aggregate({
            where: { businessId, ...recent, status: 'PAID',
              payments: { some: { status: 'SUCCEEDED',
                OR: [{ provider: null }, { provider: { not: 'PAYSTACK_TEST' } }] } } },
            _count: { _all: true }, _sum: { total: true },
          }),
          this.prisma.sale.count({ where: { businessId, ...recent, status: 'PENDING_PAYMENT' } }),
          this.prisma.sale.count({
            where: { businessId, ...recent,
              payments: { some: { provider: 'PAYSTACK_TEST' } } },
          }),
        ]);
        datasets.push({
          key, title: 'Reports & Analytics',
          columns: ['Metric', 'Value'],
          rows: [
            ['Generated at (UTC)', now.toISOString()],
            ['Date range', dateRange], ['All transactions', total],
            ['Paid real-money sales', paid._count._all],
            ['Real-money paid sales total (NGN)', str(paid._sum.total ?? '0.00')],
            ['Pending sales', pending], ['Paystack test sales (excluded from revenue)', test],
          ],
        });
      }
    }

    return {
      businessId, generatedAt: now.toISOString(), dateRange,
      includesPersonalData: dto.sections.some((section) => section === 'customers' || section === 'staff'),
      datasets,
    };
  }
}
