import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post,
  Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { StaffBranchesService } from './staff-branches.service';
import {
  BusinessScopeDto, CreateBranchDto, CreateInvitationDto, CreateRoleDto,
  InvitationTokenDto, RegisterInvitationDto, UpdateStaffDto,
} from './dto/staff-branches.dto';

@ApiTags('Staff & Branches')
@Controller('staff-branches')
export class StaffBranchesController {
  constructor(private readonly service: StaffBranchesService) {}

  @Get('summary')
  @UseGuards(AccessTokenGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Owner-only staff, branches, roles and pending invitations' })
  summary(@Req() req: AuthenticatedRequest, @Query() query: BusinessScopeDto) {
    return this.service.summary(req.userId, query.businessId);
  }

  @Post('branches')
  @UseGuards(AccessTokenGuard) @ApiBearerAuth()
  createBranch(@Req() req: AuthenticatedRequest, @Body() dto: CreateBranchDto) {
    return this.service.createBranch(req.userId, dto);
  }

  @Post('roles')
  @UseGuards(AccessTokenGuard) @ApiBearerAuth()
  createRole(@Req() req: AuthenticatedRequest, @Body() dto: CreateRoleDto) {
    return this.service.createRole(req.userId, dto);
  }

  @Post('invitations')
  @UseGuards(AccessTokenGuard) @ApiBearerAuth()
  invite(@Req() req: AuthenticatedRequest, @Body() dto: CreateInvitationDto) {
    return this.service.invite(req.userId, dto);
  }

  @Get('invitations/preview')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  preview(@Query() query: InvitationTokenDto) {
    return this.service.preview(query.token);
  }

  @Post('invitations/register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(@Body() dto: RegisterInvitationDto) {
    return this.service.registerInvited(dto);
  }

  @Post('invitations/accept')
  @UseGuards(AccessTokenGuard) @ApiBearerAuth()
  accept(@Req() req: AuthenticatedRequest, @Body() dto: InvitationTokenDto) {
    return this.service.accept(req.userId, dto.token);
  }

  @Patch('members/:membershipId')
  @UseGuards(AccessTokenGuard) @ApiBearerAuth()
  updateStaff(@Req() req: AuthenticatedRequest,
              @Param('membershipId', ParseUUIDPipe) id: string,
              @Body() dto: UpdateStaffDto) {
    return this.service.updateStaff(req.userId, id, dto);
  }

  @Post('invitations/:invitationId/revoke')
  @UseGuards(AccessTokenGuard) @ApiBearerAuth()
  revoke(@Req() req: AuthenticatedRequest,
         @Param('invitationId', ParseUUIDPipe) id: string,
         @Body() dto: BusinessScopeDto) {
    return this.service.revoke(req.userId, dto.businessId, id);
  }
}
