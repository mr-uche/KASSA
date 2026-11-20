import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { requireBusinessPermission } from '../business-access';
import {
  CreateBranchDto, CreateInvitationDto, CreateRoleDto, RegisterInvitationDto,
  UpdateStaffDto, UpdateBranchDto, UpdateRoleDto,
} from './dto/staff-branches.dto';

const INVITE_DAYS = 7;
function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
function tidy(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}
function failure(error: unknown, message: string): never {
  if ((error as { code?: string })?.code === 'P2002') throw new ConflictException(message);
  throw error;
}

@Injectable()
export class StaffBranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async owner(userId: string, businessId: string) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { role: { select: { name: true } } },
    });
    if (!membership || membership.role.name !== 'Owner') {
      throw new ForbiddenException('Only business owners can manage staff, roles and branches');
    }
  }

  private async canManageStaff(userId: string, businessId: string) {
    await requireBusinessPermission(this.prisma, userId, businessId, 'Manage staff & branches');
  }

  private async canAssignRole(userId: string, businessId: string, roleId: string) {
    const actor = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { role: { select: { name: true, permissions: true } } },
    });
    if (!actor) throw new ForbiddenException('Not a member of this business');
    if (actor.role.name === 'Owner') return;
    const target = await this.prisma.businessRole.findFirst({
      where: { id: roleId, businessId },
      select: { name: true, permissions: true },
    });
    if (!target || target.name === 'Owner') throw new ForbiddenException('Cannot assign owner role');
    const held = Array.isArray(actor.role.permissions)
      ? actor.role.permissions.filter((item): item is string => typeof item === 'string') : [];
    const requested = Array.isArray(target.permissions)
      ? target.permissions.filter((item): item is string => typeof item === 'string') : [];
    const mayGrant = (permission: string) => held.includes(permission) ||
      (held.includes('Manage sales & transactions') &&
        (permission === 'Manage sales' || permission === 'View transactions'));
    if (!requested.every(mayGrant)) {
      throw new ForbiddenException('You cannot assign a role with permissions beyond your own');
    }
  }

  async summary(userId: string, businessId: string) {
    await this.canManageStaff(userId, businessId);
    const [members, branches, roles, invitations, latestSales] = await Promise.all([
      this.prisma.businessMembership.findMany({
        where: { businessId },
        select: {
          id: true, branchId: true, roleId: true,
          user: { select: { fullName: true, email: true } },
          role: { select: { name: true } },
          branch: { select: { name: true } },
        },
      }),
      this.prisma.branch.findMany({
        where: { businessId }, include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.businessRole.findMany({
        where: { businessId },
        include: { _count: { select: { members: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.staffInvitation.findMany({
        where: { businessId, acceptedAt: null, revokedAt: null },
        select: {
          id: true, email: true, fullName: true, createdAt: true, expiresAt: true,
          role: { select: { name: true } }, branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' }, take: 100,
      }),
      this.prisma.sale.groupBy({
        by: ['branchId'], where: { businessId },
        _max: { createdAt: true },
      }),
    ]);
    const lastActivity = new Map(latestSales.map((row) =>
      [row.branchId, row._max.createdAt] as const,
    ));
    return {
      staff: [
        ...members.map((member) => ({
          id: member.id, name: member.user.fullName, email: member.user.email,
          role: member.role.name, roleId: member.roleId, branchId: member.branchId,
          branch: member.branch?.name ?? 'All branches', status: 'Active',
        })),
        ...invitations.map((invitation) => ({
          id: invitation.id, name: invitation.fullName, email: invitation.email,
          role: invitation.role.name, roleId: null, branchId: null,
          branch: invitation.branch.name,
          status: invitation.expiresAt.getTime() > Date.now() ? 'Pending' : 'Expired',
        })),
      ],
      branches: branches.map((branch) => ({
        id: branch.id, name: branch.name, code: branch.code,
        address: branch.address, city: branch.city, state: branch.state, phone: branch.phone,
        location: [branch.address, branch.city, branch.state].filter(Boolean).join(', ') || 'Not specified',
        staffCount: branch._count.members,
        status: branch.isActive ? 'Active' : 'Inactive',
        createdAt: branch.createdAt.toISOString(),
        lastActivity: lastActivity.get(branch.id)?.toISOString() ?? null,
      })),
      roles: roles.map((role) => ({
        id: role.id, name: role.name, description: role.description ?? '',
        staff: role._count.members, isSystem: role.isSystem,
        permissions: role.permissions,
        access: role.name === 'Owner' ? 'Full access' : 'Custom',
      })),
    };
  }

  async createBranch(userId: string, dto: CreateBranchDto) {
    await this.canManageStaff(userId, dto.businessId);
    const name = tidy(dto.name);
    if (!name) throw new BadRequestException('Branch name is required');
    try {
      return await this.prisma.branch.create({
        data: {
          businessId: dto.businessId, name,
          code: dto.code?.trim().toUpperCase() || null,
          address: dto.address?.trim() || null, city: dto.city?.trim() || null,
          state: dto.state?.trim() || null, phone: dto.phone?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        select: { id: true, name: true, isActive: true },
      });
    } catch (error) {
      failure(error, 'A branch with this name or code already exists');
    }
  }

  async createRole(userId: string, dto: CreateRoleDto) {
    await this.owner(userId, dto.businessId);
    const name = tidy(dto.name);
    if (!name || name.toLowerCase() === 'owner') {
      throw new BadRequestException('Choose a valid non-owner role name');
    }
    const existing = await this.prisma.businessRole.findFirst({
      where: { businessId: dto.businessId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('A role with this name already exists');
    try {
      return await this.prisma.businessRole.create({
        data: {
          businessId: dto.businessId, name, description: dto.description?.trim() || null,
          permissions: dto.permissions, isSystem: false,
        },
        select: { id: true, name: true, permissions: true },
      });
    } catch (error) {
      failure(error, 'A role with this name already exists');
    }
  }


  async updateBranch(userId: string, branchId: string, dto: UpdateBranchDto) {
    await this.canManageStaff(userId, dto.businessId);
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, businessId: dto.businessId },
      select: { id: true, isActive: true },
    });
    if (!branch) throw new NotFoundException('Branch not found in your business');
    if (branch.isActive && dto.isActive === false) {
      const members = await this.prisma.businessMembership.count({ where: { branchId, businessId: dto.businessId } });
      if (members > 0) throw new ConflictException('Reassign active staff before deactivating this branch');
    }
    const data: {
      name?: string; code?: string | null; address?: string | null;
      city?: string | null; state?: string | null; phone?: string | null; isActive?: boolean;
    } = {};
    if (dto.name !== undefined) {
      const name = tidy(dto.name);
      if (!name) throw new BadRequestException('Branch name is required');
      data.name = name;
    }
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.state !== undefined) data.state = dto.state.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (!Object.keys(data).length) throw new BadRequestException('No changes provided');
    try {
      return await this.prisma.branch.update({ where: { id: branch.id }, data });
    } catch (error) {
      failure(error, 'A branch with this name or code already exists');
    }
  }

  async updateRole(userId: string, roleId: string, dto: UpdateRoleDto) {
    await this.owner(userId, dto.businessId);
    const role = await this.prisma.businessRole.findFirst({
      where: { id: roleId, businessId: dto.businessId },
      select: { id: true, isSystem: true },
    });
    if (!role) throw new NotFoundException('Role not found in this business');
    if (role.isSystem) throw new ForbiddenException('System roles cannot be changed');
    const data: { name?: string; description?: string | null; permissions?: string[] } = {};
    if (dto.name !== undefined) {
      const name = tidy(dto.name);
      if (!name || name.toLowerCase() === 'owner') throw new BadRequestException('Invalid role name');
      const existing = await this.prisma.businessRole.findFirst({
        where: {
          businessId: dto.businessId,
          id: { not: role.id }, name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (existing) throw new ConflictException('This role name is already used');
      data.name = name;
    }
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (!Object.keys(data).length) throw new BadRequestException('No changes provided');
    try {
      return await this.prisma.businessRole.update({ where: { id: role.id }, data });
    } catch (error) {
      failure(error, 'This role name is already used');
    }
  }

  // Editing permission sets remains owner-only, to prevent privilege escalation.
  async deleteRole(userId: string, roleId: string, businessId: string) {
    await this.owner(userId, businessId);
    const role = await this.prisma.businessRole.findFirst({
      where: { id: roleId, businessId }, select: { id: true, isSystem: true },
    });
    if (!role) throw new NotFoundException('Role not found in this business');
    if (role.isSystem) throw new ForbiddenException('System roles cannot be removed');
    const [members, invites] = await Promise.all([
      this.prisma.businessMembership.count({ where: { businessId, roleId } }),
      this.prisma.staffInvitation.count({ where: { businessId, roleId } }),
    ]);
    if (members || invites) {
      throw new ConflictException('Reassign staff and resolve invitations before removing this role');
    }
    try {
      await this.prisma.businessRole.delete({ where: { id: roleId, businessId } });
    } catch (cause) {
      if ((cause as { code?: string })?.code === 'P2003') {
        throw new ConflictException('This role is currently in use and cannot be removed');
      }
      throw cause;
    }
    return { deleted: true };
  }

  private async validAssignment(businessId: string, roleId: string, branchId: string) {
    const [role, branch] = await Promise.all([
      this.prisma.businessRole.findFirst({
        where: { id: roleId, businessId }, select: { id: true, name: true },
      }),
      this.prisma.branch.findFirst({
        where: { id: branchId, businessId, isActive: true }, select: { id: true },
      }),
    ]);
    if (!role || role.name === 'Owner') throw new BadRequestException('Select a non-owner role in this business');
    if (!branch) throw new BadRequestException('Select an active branch in this business');
  }

  async invite(userId: string, dto: CreateInvitationDto) {
    await this.canManageStaff(userId, dto.businessId);
    await this.validAssignment(dto.businessId, dto.roleId, dto.branchId);
    await this.canAssignRole(userId, dto.businessId, dto.roleId);
    const email = dto.email.trim().toLowerCase();
    const name = tidy(dto.fullName);
    if (!name) throw new BadRequestException('Staff full name is required');

    const member = await this.prisma.businessMembership.findFirst({
      where: { businessId: dto.businessId, user: { email } },
      select: { id: true },
    });
    if (member) throw new ConflictException('This user is already a member of the business');
    const pending = await this.prisma.staffInvitation.findFirst({
      where: {
        businessId: dto.businessId, email,
        acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (pending) throw new ConflictException('An active invitation already exists for this email');

    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.staffInvitation.create({
      data: {
        businessId: dto.businessId, roleId: dto.roleId, branchId: dto.branchId,
        email, fullName: name, message: dto.message?.trim() || null,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + INVITE_DAYS * 86400_000),
      },
      select: { id: true, expiresAt: true },
    });
    // Token is returned once to the owner. Do not store raw token in database or logs.
    // Email delivery isn't configured; the owner must copy and share the link securely.
    return { ...invitation, token, delivery: 'COPY_LINK_ONLY' };
  }

  private async requireInvitation(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new NotFoundException('Invalid invitation');
    const invitation = await this.prisma.staffInvitation.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: {
        business: { select: { name: true } },
        branch: { select: { id: true, name: true, isActive: true } },
        role: { select: { id: true, name: true } },
      },
    });
    if (!invitation || invitation.revokedAt || invitation.acceptedAt ||
        invitation.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Invitation has expired, been used, or was cancelled');
    }
    if (!invitation.branch.isActive || invitation.role.name === 'Owner') {
      throw new ConflictException('This invitation needs an updated branch or role');
    }
    return invitation;
  }

  async preview(token: string) {
    const invitation = await this.requireInvitation(token);
    return {
      businessName: invitation.business.name, fullName: invitation.fullName,
      email: invitation.email, branchName: invitation.branch.name,
      roleName: invitation.role.name, message: invitation.message,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async accept(userId: string, token: string) {
    const invitation = await this.requireInvitation(token);
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { id: true, email: true },
    });
    if (!user || user.email.toLowerCase() !== invitation.email) {
      throw new ForbiddenException('Sign in with the exact invited email address');
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        // Validate the current assignment again inside the same transaction.
        const [role, branch] = await Promise.all([
          tx.businessRole.findFirst({
            where: { id: invitation.roleId, businessId: invitation.businessId },
            select: { name: true },
          }),
          tx.branch.findFirst({
            where: { id: invitation.branchId, businessId: invitation.businessId, isActive: true },
            select: { id: true },
          }),
        ]);
        if (!role || role.name === 'Owner' || !branch) {
          throw new ConflictException('The invited role or branch is no longer available');
        }
        const claim = await tx.staffInvitation.updateMany({
          where: {
            id: invitation.id, acceptedAt: null, revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { acceptedAt: new Date() },
        });
        if (claim.count !== 1) throw new ConflictException('Invitation already used or expired');
        await tx.businessMembership.create({
          data: {
            businessId: invitation.businessId, userId,
            roleId: invitation.roleId, branchId: invitation.branchId,
          },
        });
      });
    } catch (error) {
      failure(error, 'This user is already assigned to this business');
    }
    return { businessId: invitation.businessId, branchId: invitation.branchId, status: 'Active' };
  }

  async registerInvited(dto: RegisterInvitationDto) {
    const invitation = await this.requireInvitation(dto.token);
    if (await this.prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } })) {
      throw new ConflictException('Account already exists. Sign in to accept this invitation');
    }
    const passwordHash = await hash(dto.password, 12);
    let user: { id: string; email: string; fullName: string; phone: string | null };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const [role, branch] = await Promise.all([
          tx.businessRole.findFirst({
            where: { id: invitation.roleId, businessId: invitation.businessId },
            select: { name: true },
          }),
          tx.branch.findFirst({
            where: { id: invitation.branchId, businessId: invitation.businessId, isActive: true },
            select: { id: true },
          }),
        ]);
        if (!role || role.name === 'Owner' || !branch) {
          throw new ConflictException('The invited role or branch is no longer available');
        }
        const claim = await tx.staffInvitation.updateMany({
          where: {
            id: invitation.id, acceptedAt: null, revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { acceptedAt: new Date() },
        });
        if (claim.count !== 1) throw new ConflictException('Invitation already used or expired');
        const created = await tx.user.create({
          data: {
            email: invitation.email, fullName: invitation.fullName, passwordHash,
          },
          select: { id: true, email: true, fullName: true, phone: true },
        });
        await tx.businessMembership.create({
          data: {
            businessId: invitation.businessId, userId: created.id,
            roleId: invitation.roleId, branchId: invitation.branchId,
          },
        });
        return created;
      });
    } catch (error) {
      failure(error, 'This email is already registered; sign in to accept the invite');
    }
    return {
      user,
      tokenType: 'Bearer',
      accessToken: await this.jwt.signAsync({ sub: user.id, scope: 'access' }),
      expiresInSeconds: 900,
    };
  }

  async updateStaff(userId: string, membershipId: string, dto: UpdateStaffDto) {
    await this.canManageStaff(userId, dto.businessId);
    await this.validAssignment(dto.businessId, dto.roleId, dto.branchId);
    await this.canAssignRole(userId, dto.businessId, dto.roleId);
    const member = await this.prisma.businessMembership.findFirst({
      where: { id: membershipId, businessId: dto.businessId },
      include: { role: { select: { name: true } } },
    });
    if (!member) throw new NotFoundException('Staff member not found');
    if (member.userId === userId) {
      throw new ForbiddenException('Staff managers cannot change their own role or branch');
    }
    if (member.role.name === 'Owner') throw new ForbiddenException('Cannot modify the business owner');
    const updated = await this.prisma.businessMembership.update({
      where: { id: member.id },
      data: { roleId: dto.roleId, branchId: dto.branchId },
      select: { id: true, roleId: true, branchId: true },
    });
    return updated;
  }

  async revoke(userId: string, businessId: string, invitationId: string) {
    await this.canManageStaff(userId, businessId);
    const result = await this.prisma.staffInvitation.updateMany({
      where: { id: invitationId, businessId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new NotFoundException('Active invitation not found');
    return { cancelled: true };
  }
}
