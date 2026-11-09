import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { InventoryService } from './inventory.service';
import {
  CategoryCreateDto, InventoryScopeQueryDto, ProductCreateDto, RestockDto, AssignProductBarcodeDto,
} from './dto/inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List business categories and branch stock valuation at cost' })
  categories(@Req() req: AuthenticatedRequest, @Query() query: InventoryScopeQueryDto) {
    return this.inventory.listCategories(req.userId, query);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a business category (Owner only)' })
  createCategory(@Req() req: AuthenticatedRequest, @Body() dto: CategoryCreateDto) {
    return this.inventory.createCategory(req.userId, dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'List a business catalogue with stock in one authorised branch' })
  products(@Req() req: AuthenticatedRequest, @Query() query: InventoryScopeQueryDto) {
    return this.inventory.listProducts(req.userId, query);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a product and opening branch stock movement (Owner only)' })
  createProduct(@Req() req: AuthenticatedRequest, @Body() dto: ProductCreateDto) {
    return this.inventory.createProduct(req.userId, dto);
  }

  @Patch('products/:productId/barcode')
  @ApiOperation({ summary: 'Assign or replace barcode on an existing business product' })
  barcode(
    @Req() req: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AssignProductBarcodeDto,
  ) {
    return this.inventory.assignBarcode(req.userId, productId, dto);
  }

  @Post('products/:productId/restock')
  @ApiOperation({ summary: 'Increase a product stock balance and log an inventory movement (Owner only)' })
  restock(
    @Req() req: AuthenticatedRequest,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: RestockDto,
  ) {
    return this.inventory.restock(req.userId, productId, dto);
  }
}
