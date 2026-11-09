import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

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
  if (!owner && !assigned.includes(permission)) {
    throw new ForbiddenException('Your assigned role does not permit this action');
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
