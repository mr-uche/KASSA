import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { SubscriptionService } from './subscription.service';

class BillingScope {
  @IsUUID('4') businessId!: string;
}
class InitializeBilling extends BillingScope {
  @IsString() @Matches(/^[a-z0-9_-]{2,48}$/) planCode!: string;
}
class VerifyBilling extends BillingScope {
  @IsString() @MaxLength(70) @Matches(/^KSB-[0-9a-f-]{36}$/i) reference!: string;
}

@ApiTags('KASSA Subscription & Billing')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('billing')
export class SubscriptionController {
  constructor(private readonly billing: SubscriptionService) {}

  @Get('status')
  status(@Req() req: AuthenticatedRequest, @Query() query: BillingScope) {
    return this.billing.status(req.userId, query.businessId);
  }

  @Post('initialize')
  initialize(@Req() req: AuthenticatedRequest, @Body() input: InitializeBilling) {
    return this.billing.initialize(req.userId, input.businessId, input.planCode);
  }

  @Post('verify')
  verify(@Req() req: AuthenticatedRequest, @Body() input: VerifyBilling) {
    return this.billing.verify(req.userId, input.businessId, input.reference);
  }
}
