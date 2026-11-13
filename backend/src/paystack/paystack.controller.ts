import { Body, Controller, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { InitializePaystackDto, ReconcilePaystackDto, VerifyPaystackDto } from './paystack.dto';
import { PaystackService } from './paystack.service';
import { verifyPaystackSignature } from './paystack.signature';

@ApiTags('Payments – Paystack test')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('payments/paystack')
export class PaystackController {
  constructor(private readonly payments: PaystackService) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize a Paystack hosted test checkout for an existing pending sale' })
  initialize(@Req() req: AuthenticatedRequest, @Body() dto: InitializePaystackDto) {
    return this.payments.initialize(req.userId, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Independently verify a saved Paystack test payment and fulfill once' })
  verify(@Req() req: AuthenticatedRequest, @Body() dto: VerifyPaystackDto) {
    return this.payments.verifyForUser(req.userId, dto.saleId);
  }

  @Post('reconcile')
  @ApiOperation({ summary: 'Owner-only manual reconciliation of up to 5 pending Paystack test payments' })
  reconcile(@Req() req: AuthenticatedRequest, @Body() dto: ReconcilePaystackDto) {
    return this.payments.reconcile(req.userId, dto);
  }
}

@ApiTags('Paystack webhooks')
@Controller('payments/paystack')
export class PaystackWebhookController {
  constructor(private readonly payments: PaystackService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async webhook(@Req() req: Request & { rawBody?: Buffer }) {
    const raw = req.rawBody;
    // NestJS rawBody:true in main.ts is REQUIRED to capture bytes before JSON parsing.
    if (!Buffer.isBuffer(raw) ||
      !verifyPaystackSignature(
        raw,
        typeof req.headers['paystack-signature'] === 'string' ? req.headers['paystack-signature'] : undefined,
        typeof req.headers['x-paystack-signature'] === 'string' ? req.headers['x-paystack-signature'] : undefined,
        process.env.PAYSTACK_WEBHOOK_SECRET,
        process.env.PAYSTACK_SECRET_KEY,
      )) throw new UnauthorizedException('Invalid Paystack webhook signature');
    return this.payments.handleSignedWebhook(req.body as unknown);
  }
}
