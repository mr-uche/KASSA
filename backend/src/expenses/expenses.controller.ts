import {
  BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post,
  Query, Req, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { CreateExpenseDto, ExpenseScopeDto } from './dto/expenses.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: ExpenseScopeDto) {
    return this.expenses.list(req.userId, query.businessId, query.branchId, query.month);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateExpenseDto) {
    return this.expenses.create(req.userId, body);
  }

  @Post(':expenseId/receipt')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  uploadReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Query() query: ExpenseScopeDto,
    @UploadedFile() file?: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    return this.expenses.attachReceipt(req.userId, query.businessId, expenseId, file);
  }

  @Get(':expenseId/receipt')
  async downloadReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Query() query: ExpenseScopeDto,
    @Res() res: Response,
  ) {
    const receipt = await this.expenses.receipt(req.userId, query.businessId, expenseId);
    res.setHeader('Content-Type', receipt.mime);
    res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(receipt.name));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.end(receipt.bytes);
  }
}
