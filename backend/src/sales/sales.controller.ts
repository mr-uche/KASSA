import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { ConfirmCashDto, CreateSaleDto, OfflineCashSaleDto, SalesListQueryDto, ScanLookupQueryDto } from './dto/sales.dto';
import { SalesService } from './sales.service';

@ApiTags('Sales') @ApiBearerAuth() @UseGuards(AccessTokenGuard) @Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post() @ApiOperation({ summary: 'Create pending sale with server-calculated totals' })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateSaleDto) {
    return this.sales.create(request.userId, dto);
  }
  @Post('offline-sync')
  @ApiOperation({ summary: 'Synchronize a collected offline cash sale atomically, idempotently and with stock checks' })
  offlineSync(@Req() request: AuthenticatedRequest, @Body() dto: OfflineCashSaleDto) {
    return this.sales.syncOfflineCash(request.userId, dto);
  }

  @Get() @ApiOperation({ summary: 'List latest 100 sales for authorised business branch' })
  list(@Req() request: AuthenticatedRequest, @Query() query: SalesListQueryDto) {
    return this.sales.list(request.userId, query);
  }
  @Get('catalog') @ApiOperation({ summary: 'Checkout-safe product catalogue for permitted cashiers' })
  catalog(@Req() request: AuthenticatedRequest, @Query() query: SalesListQueryDto) {
    return this.sales.catalog(request.userId, query);
  }
  @Get('lookup') @ApiOperation({ summary: 'Find a product by barcode or SKU for authorised cashiers' })
  lookup(@Req() request: AuthenticatedRequest, @Query() query: ScanLookupQueryDto) {
    return this.sales.lookupProduct(request.userId, query);
  }

  @Get(':saleId') @ApiOperation({ summary: 'View sale with items and payment status' })
  one(@Req() request: AuthenticatedRequest, @Param('saleId', ParseUUIDPipe) id: string) {
    return this.sales.getOne(request.userId, id);
  }
  @Post(':saleId/confirm-cash')
  @ApiOperation({ summary: 'Explicitly confirm physical cash received, then decrement inventory atomically' })
  confirmCash(
    @Req() request: AuthenticatedRequest,
    @Param('saleId', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmCashDto,
  ) {
    return this.sales.confirmCash(request.userId, id, dto);
  }
}
