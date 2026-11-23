import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { requireSubscriptionFeature } from './subscription/subscription-access';

// Never rely on hidden frontend buttons for authorization.
// Owner role has full access. Other roles are restricted to explicitly granted
// business permissions and exactly one active assigned branch.
export async function requireBusinessPermission(
  prisma: PrismaService,
  userId: string,
  businessId: string,
  permission: string,
  branchId?: string,
) {
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId } },
    select: { branchId: true, role: { select: { name: true, permissions: true } } },
  });
  if (!membership) throw new ForbiddenException('Not a member of this business');
  const owner = membership.role.name === 'Owner';
  const assigned = Array.isArray(membership.role.permissions)
    ? membership.role.permissions : [];
  // Migrate legacy combined-sale permissions without unexpectedly locking
  // existing staff out. New roles can grant each capability independently.
  const legacySales = assigned.includes('Manage sales & transactions') &&
    (permission === 'Manage sales' || permission === 'View transactions');
  if (!owner && !assigned.includes(permission) && !legacySales) {
    throw new ForbiddenException('Your assigned role does not permit this action');
  }
  // Subscription entitlements are business-wide and independent of the
  // member's role. Owners do not bypass an enabled plan feature restriction.
  if (permission === 'Manage customers') {
    await requireSubscriptionFeature(prisma, businessId, 'customers');
  } else if (permission === 'View reports & analytics') {
    await requireSubscriptionFeature(prisma, businessId, 'reports');
  } else if (permission === 'View financial overview') {
    await requireSubscriptionFeature(prisma, businessId, 'grossProfit');
  }

  if (branchId) {
    if (!owner && membership.branchId !== branchId) {
      throw new ForbiddenException('You cannot access another branch');
    }
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId, isActive: true },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Active business branch not found');
  }
  return membership;
}
