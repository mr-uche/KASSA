import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireBusinessPermission } from '../business-access';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { CreateMerchantBankAccountDto, UpdateMerchantBankAccountDto } from './dto/merchant-bank-account.dto';

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
    await requireBusinessPermission(this.prisma, userId, businessId, 'Manage business settings');
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
    await requireBusinessPermission(this.prisma, userId, businessId, 'Manage business settings');
    const includesBusiness = dto.businessName !== undefined ||
      dto.businessType !== undefined || dto.payoutSchedule !== undefined;
    const includesBranch = dto.branchAddress !== undefined || dto.branchPhone !== undefined;
    if (!includesBusiness && !includesBranch) {
      throw new BadRequestException('No supported settings were provided');
    }
    if (dto.businessName !== undefined && !dto.businessName.trim()) {
      throw new BadRequestException('Business name cannot be blank');
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

  // Only business owners may register or manage receiving instructions.
  // Bank ownership and account-name verification are NOT implied.
  async listMerchantAccounts(userId: string, businessId: string) {
    await this.requireOwner(userId, businessId);
    return this.prisma.merchantBankAccount.findMany({
      where: { businessId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createMerchantAccount(userId: string, businessId: string, dto: CreateMerchantBankAccountDto) {
    await this.requireOwner(userId, businessId);
    const bankName = dto.bankName.trim();
    const accountName = dto.accountName.trim();
    if (!bankName || !accountName || !/^\d{10}$/.test(dto.accountNumber)) {
      throw new BadRequestException('Enter a bank name, a 10-digit receiving account and an account name');
    }
    return this.prisma.$transaction(async tx => {
      const count = await tx.merchantBankAccount.count({ where: { businessId } });
      if (count >= 10) throw new BadRequestException('Maximum of ten receiving accounts per business');
      const makeDefault = dto.isDefault === true || count === 0;
      if (makeDefault) await tx.merchantBankAccount.updateMany({ where: { businessId, isDefault: true }, data: { isDefault: false } });
      return tx.merchantBankAccount.create({
        data: { businessId, bankName, accountNumber: dto.accountNumber,
          accountName, isDefault: makeDefault },
      });
    });
  }

  async updateMerchantAccount(userId: string, businessId: string, accountId: string, dto: UpdateMerchantBankAccountDto) {
    await this.requireOwner(userId, businessId);
    const account = await this.prisma.merchantBankAccount.findFirst({ where: { id: accountId, businessId } });
    if (!account) throw new NotFoundException('Receiving account not found');
    if (dto.isDefault === false && account.isDefault) {
      throw new BadRequestException('Choose a different default account instead');
    }
    if (dto.bankName !== undefined && !dto.bankName.trim() ||
        dto.accountName !== undefined && !dto.accountName.trim()) {
      throw new BadRequestException('Bank and account names cannot be blank');
    }
    if (dto.bankName === undefined && dto.accountName === undefined &&
        dto.accountNumber === undefined && dto.isDefault === undefined) {
      throw new BadRequestException('No account changes provided');
    }
    return this.prisma.$transaction(async tx => {
      if (dto.isDefault === true) await tx.merchantBankAccount.updateMany({
        where: { businessId, isDefault: true }, data: { isDefault: false },
      });
      return tx.merchantBankAccount.update({
        where: { id: accountId },
        data: {
          ...(dto.bankName !== undefined ? { bankName: dto.bankName.trim() } : {}),
          ...(dto.accountName !== undefined ? { accountName: dto.accountName.trim() } : {}),
          ...(dto.accountNumber !== undefined ? { accountNumber: dto.accountNumber } : {}),
          ...(dto.isDefault === true ? { isDefault: true } : {}),
        },
      });
    });
  }

  async deleteMerchantAccount(userId: string, businessId: string, accountId: string) {
    await this.requireOwner(userId, businessId);
    return this.prisma.$transaction(async tx => {
      const account = await tx.merchantBankAccount.findFirst({ where: { id: accountId, businessId } });
      if (!account) throw new NotFoundException('Receiving account not found');
      await tx.merchantBankAccount.delete({ where: { id: accountId } });
      if (account.isDefault) {
        const next = await tx.merchantBankAccount.findFirst({ where: { businessId }, orderBy: { createdAt: 'asc' } });
        if (next) await tx.merchantBankAccount.update({ where: { id: next.id }, data: { isDefault: true } });
      }
      return { deleted: true };
    });
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

      if (dto.accountNumber && dto.settlementBank?.trim()) {
        await tx.merchantBankAccount.create({
          data: {
            businessId: business.id,
            bankName: dto.settlementBank.trim(),
            accountNumber: dto.accountNumber,
            accountName: dto.accountName?.trim() || dto.businessName.trim(),
            isDefault: true,
          },
        });
      }

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
        receivingAccountStatus: dto.accountNumber ? 'OWNER_SUPPLIED_UNVERIFIED' : 'NOT_CONFIGURED',
        branches,
        savedStaffDrafts: dto.staff?.length ?? 0,
        message: 'Business onboarded. Customer payments go directly to the business; no KASSA payouts occur.',
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
            branches: { select: { id: true, name: true, address: true, isActive: true } },
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
