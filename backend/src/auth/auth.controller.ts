import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessTokenGuard, type AuthenticatedRequest } from './access-token.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterDto } from './dto/register.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new merchant user' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Renew a short-lived access token using an active remembered session' })
  refresh(@Body() dto: RefreshSessionDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Revoke a remembered session token' })
  logout(@Body() dto: RefreshSessionDto) {
    return this.auth.logout(dto);
  }

  @Delete('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({
    summary: 'Permanently close own Kassa login, anonymize personal profile and revoke all sessions',
    description: 'Financial records and merchant businesses remain for accounting. Requires current password and exact confirmation phrase.',
  })
  deleteAccount(@Req() req: AuthenticatedRequest, @Body() dto: DeleteAccountDto) {
    return this.auth.deleteAccount(req.userId, dto);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  getMe(@Req() request: AuthenticatedRequest) {
    return this.auth.getProfile(request.userId);
  }
}
