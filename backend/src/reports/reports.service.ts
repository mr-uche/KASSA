import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { requireBusinessPermission } from '../business-access';
import { ReportsQueryDto } from './dto/reports-query.dto';

type TotalsRow = {
  totalTransactions: string; paidTransactions: string; paidAmount: string;
  pendingTransactions: string; failedPayments: string; successfulPayments: string;
};
type AmountRow = { amount: string };
type TrendRow = { period: string; channel: string; amount: string; transactions: string };
type ChannelRow = { channel: string; amount: string; transactions: string };
type StaffRow = { id: string | null; name: string; transactions: string; amount: string; failed: string };
type BranchRow = { id: string; amount: string; transactions: string };
type ProductRow = { id: string; name: string; quantity: string; amount: string };

const CHANNELS = ['BANK_TRANSFER', 'POS', 'CASH', 'USSD', 'CARD', 'WALLET'] as const;

function dateOnly(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Dates must use YYYY-MM-DD');
  }
  const millis = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(millis) || new Date(millis).toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Invalid calendar date');
  }
  return millis;
}
function asKobo(value: string): bigint {
  const [naira, fraction = ''] = value.split('.');
  return BigInt(naira) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}
function money(kobo: bigint) {
  const negative = kobo < 0n;
  const abs = negative ? -kobo : kobo;
  return (negative ? '-' : '') + String(abs / 100n) + '.' +
    String(abs % 100n).padStart(2, '0');
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, query: ReportsQueryDto) {
    const firstDay = dateOnly(query.from);
    const lastDay = dateOnly(query.to);
    const days = Math.floor((lastDay - firstDay) / 86400000) + 1;
    if (days < 1 || days > 366) {
      throw new BadRequestException('Choose a date range from 1 to 366 days');
    }

    // All Kassa business-day bounds and chart buckets use Africa/Lagos (UTC+1).
    const from = new Date(firstDay - 3600000);
    const until = new Date(lastDay + 86400000 - 3600000);
    const previousFrom = new Date(from.getTime() - days * 86400000);

    const membership = await requireBusinessPermission(
      this.prisma, userId, query.businessId, 'View reports & analytics',
    );
    const owner = membership.role.name === 'Owner';
    const branchId = owner ? query.branchId ?? null : membership.branchId;
    if (!owner && !branchId) throw new ForbiddenException('No branch is assigned');
    if (!owner && query.branchId && query.branchId !== branchId) {
      throw new ForbiddenException('You cannot view another branch’s reports');
    }
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId, businessId: query.businessId,
          ...(!owner ? { isActive: true } : {}),
        },
        select: { id: true },
      });
      if (!branch) throw new NotFoundException('Permitted branch not found in this business');
    }

    const branchClause = branchId
      ? Prisma.sql`AND sale."branchId" = ${branchId}::uuid` : Prisma.empty;
    const paid = Prisma.sql`sale."status" = 'PAID' AND payment."status" = 'SUCCEEDED'`;

    // Aggregate the entire range in PostgreSQL. The sales list endpoint's
    // 100-row pagination limit is deliberately not used for reporting.
    function base(start: Date, end: Date) {
      return Prisma.sql`
        FROM "Sale" sale
        LEFT JOIN "User" cashier ON cashier."id" = sale."cashierId"
        LEFT JOIN LATERAL (
          SELECT p."channel", p."status"
          FROM "Payment" p WHERE p."saleId" = sale."id"
          ORDER BY CASE WHEN p."status" = 'SUCCEEDED' THEN 0 ELSE 1 END,
                   p."createdAt" DESC
          LIMIT 1
        ) payment ON TRUE
        WHERE sale."businessId" = ${query.businessId}::uuid
          AND sale."createdAt" >= ${start} AND sale."createdAt" < ${end}
          ${branchClause}
          -- Tests must never inflate real revenue, paid counts, or failure rates.
          AND NOT EXISTS (
            SELECT 1 FROM "Payment" test_payment
            WHERE test_payment."saleId" = sale."id"
              AND test_payment."provider" = 'PAYSTACK_TEST'
          )
      `;
    }
    const current = base(from, until);
    const previous = base(previousFrom, from);
    const [totals, previousTotals, trend, channels, staff, branchTotals, products, branches] = await Promise.all([
      this.prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
        SELECT COUNT(*)::text AS "totalTransactions",
          COUNT(*) FILTER (WHERE ${paid})::text AS "paidTransactions",
          COALESCE(SUM(sale."total") FILTER (WHERE ${paid}), 0)::text AS "paidAmount",
          COUNT(*) FILTER (WHERE sale."status" IN ('DRAFT', 'PENDING_PAYMENT'))::text AS "pendingTransactions",
          COUNT(*) FILTER (WHERE payment."status" = 'FAILED')::text AS "failedPayments",
          COUNT(*) FILTER (WHERE payment."status" = 'SUCCEEDED')::text AS "successfulPayments"
        ${current}
      `),
      this.prisma.$queryRaw<AmountRow[]>(Prisma.sql`
        SELECT COALESCE(SUM(sale."total") FILTER (WHERE ${paid}), 0)::text AS "amount"
        ${previous}
      `),
      this.prisma.$queryRaw<TrendRow[]>(Prisma.sql`
        SELECT TO_CHAR(DATE_TRUNC(${query.granularity}::text,
                 sale."createdAt" + INTERVAL '1 hour'), 'YYYY-MM-DD') AS "period",
          payment."channel"::text AS "channel",
          SUM(sale."total")::text AS "amount",
          COUNT(*)::text AS "transactions"
        ${current} AND ${paid}
        GROUP BY 1, 2 ORDER BY 1 ASC
      `),
      this.prisma.$queryRaw<ChannelRow[]>(Prisma.sql`
        SELECT payment."channel"::text AS "channel",
          SUM(sale."total")::text AS "amount",
          COUNT(*)::text AS "transactions"
        ${current} AND ${paid}
        GROUP BY 1
      `),
      this.prisma.$queryRaw<StaffRow[]>(Prisma.sql`
        SELECT sale."cashierId"::text AS "id",
          COALESCE(cashier."fullName", 'Unassigned') AS "name",
          COUNT(*) FILTER (WHERE ${paid})::text AS "transactions",
          COALESCE(SUM(sale."total") FILTER (WHERE ${paid}), 0)::text AS "amount",
          COUNT(*) FILTER (WHERE payment."status" = 'FAILED')::text AS "failed"
        ${current}
        GROUP BY sale."cashierId", cashier."fullName"
        ORDER BY SUM(sale."total") FILTER (WHERE ${paid}) DESC NULLS LAST
        LIMIT 50
      `),
      this.prisma.$queryRaw<BranchRow[]>(Prisma.sql`
        SELECT sale."branchId"::text AS "id",
          SUM(sale."total")::text AS "amount", COUNT(*)::text AS "transactions"
        ${current} AND ${paid}
        GROUP BY sale."branchId"
      `),
      this.prisma.$queryRaw<ProductRow[]>(Prisma.sql`
        SELECT item."productId"::text AS "id",
          MAX(item."productNameSnapshot") AS "name",
          SUM(item."quantity")::text AS "quantity",
          SUM(item."lineTotal")::text AS "amount"
        FROM "SaleItem" item
        JOIN "Sale" sale ON sale."id" = item."saleId"
        WHERE sale."businessId" = ${query.businessId}::uuid
          AND sale."createdAt" >= ${from} AND sale."createdAt" < ${until}
          ${branchClause}
          AND sale."status" = 'PAID'
          AND EXISTS (
            SELECT 1 FROM "Payment" p WHERE p."saleId" = sale."id" AND p."status" = 'SUCCEEDED'
              AND COALESCE(p."provider", '') <> 'PAYSTACK_TEST'
          )
        GROUP BY item."productId"
        ORDER BY SUM(item."lineTotal") DESC
        LIMIT 10
      `),
      this.prisma.branch.findMany({
        where: { businessId: query.businessId, ...(branchId ? { id: branchId } : {}) },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const total = totals[0] ?? {
      totalTransactions: '0', paidTransactions: '0', paidAmount: '0',
      pendingTransactions: '0', failedPayments: '0', successfulPayments: '0',
    };
    const revenue = asKobo(total.paidAmount);
    const previousRevenue = asKobo(previousTotals[0]?.amount ?? '0');
    const paidCount = Number(total.paidTransactions);
    const failures = Number(total.failedPayments);
    const completed = failures + Number(total.successfulPayments);
    const channelMap = new Map(channels.map((row) => [row.channel, row]));
    const branchMap = new Map(branchTotals.map((row) => [row.id, row]));
    const branchSummary = branches.map((branch) => ({
      id: branch.id, name: branch.name,
      amount: money(asKobo(branchMap.get(branch.id)?.amount ?? '0')),
      paidTransactions: Number(branchMap.get(branch.id)?.transactions ?? '0'),
    })).sort((a, b) => asKobo(b.amount) > asKobo(a.amount) ? 1 :
      asKobo(b.amount) < asKobo(a.amount) ? -1 : 0);
    const topBranch = branchSummary.length && asKobo(branchSummary[0].amount) > 0n
      ? { ...branchSummary[0],
          sharePct: Math.round(Number(asKobo(branchSummary[0].amount) * 1000n / revenue)) / 10 }
      : null;

    return {
      scope: {
        businessId: query.businessId, branchId, from: query.from, to: query.to,
        granularity: query.granularity, timezone: 'Africa/Lagos',
        generatedAt: new Date().toISOString(),
      },
      summary: {
        paidSales: money(revenue), paidTransactions: paidCount,
        averageSale: money(paidCount
          ? (revenue + BigInt(Math.floor(paidCount / 2))) / BigInt(paidCount) : 0n),
        totalTransactions: Number(total.totalTransactions),
        pendingTransactions: Number(total.pendingTransactions),
        failedPayments: failures,
        failedPaymentRate: completed ? Math.round(failures / completed * 1000) / 10 : null,
        previousPaidSales: money(previousRevenue),
        salesChangePercent: previousRevenue
          ? Math.round(Number((revenue - previousRevenue) * 10000n / previousRevenue)) / 100
          : null,
        topBranch,
      },
      trend: trend.map((row) => ({
        period: row.period, channel: row.channel,
        amount: money(asKobo(row.amount)), transactions: Number(row.transactions),
      })),
      channels: CHANNELS.map((channel) => {
        const entry = channelMap.get(channel);
        const amount = asKobo(entry?.amount ?? '0');
        return {
          channel, amount: money(amount), paidTransactions: Number(entry?.transactions ?? '0'),
          sharePct: revenue ? Math.round(Number(amount * 1000n / revenue)) / 10 : 0,
        };
      }),
      staff: staff.map((row) => ({
        id: row.id, name: row.name, paidTransactions: Number(row.transactions),
        paidSales: money(asKobo(row.amount)), failedPayments: Number(row.failed),
      })).filter((row) => row.paidTransactions > 0 || row.failedPayments > 0),
      branches: branchSummary,
      products: products.map((row) => ({
        id: row.id, name: row.name, unitsSold: Number(row.quantity),
        paidSales: money(asKobo(row.amount)),
      })),
      notes: [
        'Only PAID sales with a SUCCEEDED payment count as revenue.',
        'Paystack TEST payments are excluded from financial and revenue analytics.',
        'Sales are grouped by their creation date in Africa/Lagos, using current payment status.',
        'Pending electronic payments are excluded from received revenue.',
        'Failed payment rate excludes pending attempts; N/A means no completed attempts.',
        'Figures are gross sales, not profit or bank-settled funds.',
      ],
    };
  }
}
