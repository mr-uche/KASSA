import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { BusinessesService } from './businesses.service';
import { BusinessExportService } from './business-export.service';
import { ExportBusinessDto } from './dto/export-business.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { CreateMerchantBankAccountDto, UpdateMerchantBankAccountDto } from './dto/merchant-bank-account.dto';

@ApiTags('Businesses')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService, private readonly exports: BusinessExportService) {}

  @Post('onboarding')
  @ApiOperation({ summary: 'Create a business and its first branches, with the caller as owner' })
  onboard(@Req() req: AuthenticatedRequest, @Body() dto: OnboardingDto) {
    return this.businesses.onboard(req.userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List only businesses to which the current user belongs' })
  mine(@Req() req: AuthenticatedRequest) {
    return this.businesses.myBusinesses(req.userId);
  }

  @Post(':businessId/export')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Owner-only export of real business data, with explicit maximum size' })
  exportBusiness(@Req() req: AuthenticatedRequest,
                 @Param('businessId', ParseUUIDPipe) businessId: string,
                 @Body() dto: ExportBusinessDto) {
    return this.exports.export(req.userId, businessId, dto);
  }

  @Get(':businessId/receiving-accounts')
  @ApiOperation({ summary: 'Owner-only listing of merchant receiving bank accounts; not payment-verified' })
  receivingAccounts(@Req() req: AuthenticatedRequest, @Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.businesses.listMerchantAccounts(req.userId, businessId);
  }

  @Post(':businessId/receiving-accounts')
  @ApiOperation({ summary: 'Owner adds a merchant-owned receiving account (account name is unverified)' })
  addReceivingAccount(@Req() req: AuthenticatedRequest,
      @Param('businessId', ParseUUIDPipe) businessId: string, @Body() dto: CreateMerchantBankAccountDto) {
    return this.businesses.createMerchantAccount(req.userId, businessId, dto);
  }

  @Patch(':businessId/receiving-accounts/:accountId')
  @ApiOperation({ summary: 'Owner edits an existing receiving account or makes it the default' })
  updateReceivingAccount(@Req() req: AuthenticatedRequest,
      @Param('businessId', ParseUUIDPipe) businessId: string,
      @Param('accountId', ParseUUIDPipe) accountId: string, @Body() dto: UpdateMerchantBankAccountDto) {
    return this.businesses.updateMerchantAccount(req.userId, businessId, accountId, dto);
  }

  @Delete(':businessId/receiving-accounts/:accountId')
  @ApiOperation({ summary: 'Owner removes an existing receiving account' })
  deleteReceivingAccount(@Req() req: AuthenticatedRequest,
      @Param('businessId', ParseUUIDPipe) businessId: string,
      @Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.businesses.deleteMerchantAccount(req.userId, businessId, accountId);
  }

  @Get(':businessId/settings')
  @ApiOperation({ summary: 'Get authenticated owner business and branch settings' })
  settings(@Req() req: AuthenticatedRequest,
           @Param('businessId', ParseUUIDPipe) businessId: string,
           @Query('branchId') branchId?: string) {
    return this.businesses.settings(req.userId, businessId, branchId);
  }

  @Patch(':businessId/settings')
  @ApiOperation({ summary: 'Update owner-controlled business profile, branch contact and payout preference' })
  updateSettings(@Req() req: AuthenticatedRequest,
                 @Param('businessId', ParseUUIDPipe) businessId: string,
                 @Body() dto: UpdateBusinessSettingsDto) {
    return this.businesses.updateSettings(req.userId, businessId, dto);
  }
}
