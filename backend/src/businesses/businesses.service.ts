import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

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
        role: { select: { name: true } },
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
      myRole: membership.role.name,
    }));
  }
}
