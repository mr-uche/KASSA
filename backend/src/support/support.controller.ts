import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { SendSupportMessageDto } from './dto/send-message.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('my-thread')
  @ApiOperation({ summary: 'Get only the signed-in account support messages' })
  myThread(@Req() req: AuthenticatedRequest) {
    return this.support.ownThread(req.userId);
  }

  @Post('message')
  @Throttle({ default: { ttl: 60000, limit: 12 } })
  @ApiOperation({ summary: 'Send a support message to the platform inbox' })
  send(@Req() req: AuthenticatedRequest, @Body() body: SendSupportMessageDto) {
    return this.support.send(req.userId, body.body);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'View support conversations (platform administrators only)' })
  inbox(@Req() req: AuthenticatedRequest) {
    return this.support.inbox(req.userId);
  }

  @Get('inbox/:id')
  @ApiOperation({ summary: 'View a support conversation (platform administrators only)' })
  open(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.threadForAgent(req.userId, id);
  }

  @Post('inbox/:id/reply')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Reply to a support conversation (platform administrators only)' })
  reply(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendSupportMessageDto) {
    return this.support.reply(req.userId, id, body.body);
  }
}
