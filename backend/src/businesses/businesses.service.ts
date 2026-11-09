import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOwner(userId: string, businessId: string): Promise<void> {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { role: { select: { name: true } } },
    });
    if (!membership || membership.role.name !== 'Owner') {
      throw new ForbiddenException('Only business owners can edit business settings');
    }
  }

  async settings(userId: string, businessId: string, branchId?: string) {
    await this.requireOwner(userId, businessId);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true, name: true, type: true, payoutSchedule: true,
        settlementBankName: true, settlementAccountLast4: true,
      },
    });
    if (!business) throw new NotFoundException('Business not found');

    const branch = await this.prisma.branch.findFirst({
      where: { businessId, ...(branchId ? { id: branchId } : {}) },
      select: { id: true, name: true, address: true, phone: true },
      orderBy: { createdAt: 'asc' },
    });
    if (branchId && !branch) throw new NotFoundException('Branch not found in this business');

    return {
      businessId: business.id,
      businessName: business.name,
      businessType: business.type ?? '',
      payoutSchedule: business.payoutSchedule,
      settlementBankName: business.settlementBankName,
      settlementAccountLast4: business.settlementAccountLast4,
      // Bank details are preferences only; no payout verification is integrated.
      payoutVerified: false,
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? '',
      branchAddress: branch?.address ?? '',
      branchPhone: branch?.phone ?? '',
    };
  }

  async updateSettings(userId: string, businessId: string, dto: UpdateBusinessSettingsDto) {
    await this.requireOwner(userId, businessId);
    const includesBusiness = dto.businessName !== undefined ||
      dto.businessType !== undefined || dto.payoutSchedule !== undefined;
    const includesBranch = dto.branchAddress !== undefined || dto.branchPhone !== undefined;
    if (!includesBusiness && !includesBranch) {
      throw new BadRequestException('No supported settings were provided');
    }
    if (includesBranch && !dto.branchId) {
      throw new BadRequestException('A branch must be selected to update its contact details');
    }
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, businessId }, select: { id: true },
      });
      if (!branch) throw new NotFoundException('Branch not found in this business');
    }

    await this.prisma.$transaction(async (tx) => {
      if (includesBusiness) {
        await tx.business.update({
          where: { id: businessId },
          data: {
            ...(dto.businessName !== undefined ? { name: dto.businessName.trim() } : {}),
            ...(dto.businessType !== undefined ? { type: dto.businessType.trim() || null } : {}),
            ...(dto.payoutSchedule !== undefined ? { payoutSchedule: dto.payoutSchedule } : {}),
          },
        });
      }
      if (includesBranch && dto.branchId) {
        await tx.branch.update({
          where: { id: dto.branchId },
          data: {
            ...(dto.branchAddress !== undefined ? { address: dto.branchAddress.trim() || null } : {}),
            ...(dto.branchPhone !== undefined ? { phone: dto.branchPhone.trim() || null } : {}),
          },
        });
      }
    });
    return this.settings(userId, businessId, dto.branchId);
  }

  async onboard(userId: string, dto: OnboardingDto) {
    const branchNames = dto.branches.map((branch) => branch.name.trim().toLowerCase());
    if (new Set(branchNames).size !== branchNames.length) {
      throw new BadRequestException('Branch names must be unique within a business');
    }
    if (dto.accountNumber && !dto.settlementBank?.trim()) {
      throw new BadRequestException('Select a bank if an account number is supplied');
    }

    const schedules = { instant: 'INSTANT', daily: 'DAILY', weekly: 'WEEKLY' } as const;
    const payoutSchedule = schedules[dto.payoutSchedule ?? 'daily'];

    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.businessName.trim(),
          type: dto.businessType?.trim() || null,
          legalName: dto.registeredName?.trim() || null,
          staffCountEstimate: dto.staffCount ?? null,
          payoutSchedule,
          settlementBankName: dto.settlementBank?.trim() || null,
          // NEVER store unverified complete bank account numbers.
          settlementAccountLast4: dto.accountNumber?.slice(-4) || null,
        },
      });

      const ownerRole = await tx.businessRole.create({
        data: {
          businessId: business.id,
          name: 'Owner',
          description: 'Business owner with full merchant access',
          permissions: ['*'],
          isSystem: true,
        },
      });

      await tx.businessMembership.create({
        data: { businessId: business.id, userId, roleId: ownerRole.id },
      });

      await tx.branch.createMany({
        data: dto.branches.map((branch) => ({
          businessId: business.id,
          name: branch.name.trim(),
          address: branch.address?.trim() || null,
          phone: branch.phone?.trim() || null,
        })),
      });

      if (dto.staff?.length) {
        await tx.staffOnboardingDraft.createMany({
          data: dto.staff.map((member) => ({
            businessId: business.id,
            fullName: member.fullName.trim(),
            roleName: member.role.trim(),
            phone: member.phone?.trim() || null,
          })),
        });
      }

      const branches = await tx.branch.findMany({
        where: { businessId: business.id },
        select: { id: true, name: true, address: true, phone: true },
        orderBy: { name: 'asc' },
      });
      return {
        id: business.id,
        name: business.name,
        type: business.type,
        payoutSchedule: business.payoutSchedule,
        payoutSetupStatus: 'PENDING_VERIFICATION',
        branches,
        savedStaffDrafts: dto.staff?.length ?? 0,
        message: 'Business onboarded. Staff entries are drafts; payouts are not enabled.',
      };
    });
  }

  async myBusinesses(userId: string) {
    const memberships = await this.prisma.businessMembership.findMany({
      where: { userId },
      select: {
        branchId: true,
        role: { select: { name: true, permissions: true } },
        business: {
          select: {
            id: true, name: true, type: true, createdAt: true,
            branches: { select: { id: true, name: true, isActive: true } },
          },
        },
      },
    });
    return memberships.map((membership) => ({
      ...membership.business,
      branches: membership.role.name === 'Owner'
        ? membership.business.branches
        : membership.business.branches.filter((branch) => branch.id === membership.branchId),
      myRole: membership.role.name,
      // Expose only the current user's own role permissions so the UI can
      // hide unavailable navigation; API authorization remains authoritative.
      myPermissions: Array.isArray(membership.role.permissions)
        ? membership.role.permissions.filter((permission): permission is string => typeof permission === 'string')
        : [],
    }));
  }
}
