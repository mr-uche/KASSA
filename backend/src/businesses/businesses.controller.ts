import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { BusinessesService } from './businesses.service';
import { OnboardingDto } from './dto/onboarding.dto';

@ApiTags('Businesses')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

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
}
