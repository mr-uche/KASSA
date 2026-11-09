import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Revenue, payments, channel trends, staff, branch and product analytics',
    description: 'Enforces business membership and View reports & analytics permission. Data is aggregated in PostgreSQL.',
  })
  summary(@Req() req: AuthenticatedRequest, @Query() query: ReportsQueryDto) {
    return this.reports.summary(req.userId, query);
  }
}
