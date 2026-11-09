import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from '../auth/access-token.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CustomersScopeDto, UpdateCustomerDto } from './dto/customers.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List latest 500 customers for the owner of a business' })
  list(@Req() req: AuthenticatedRequest, @Query() query: CustomersScopeDto) {
    return this.customers.list(req.userId, query.businessId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a customer (Owner or role with Manage customers)' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCustomerDto) {
    return this.customers.create(req.userId, dto);
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Read a single customer by ID within your business' })
  one(
    @Req() req: AuthenticatedRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: CustomersScopeDto,
  ) {
    return this.customers.one(req.userId, query.businessId, customerId);
  }

  @Patch(':customerId')
  @ApiOperation({ summary: 'Edit a customer (Owner or role with Manage customers)' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(req.userId, customerId, dto);
  }
}
