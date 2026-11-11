import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, IsISO8601, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class SaleLineDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') productId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(1000000) quantity!: number;
}
export class CreateSaleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') businessId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') branchId!: string;
  @ApiProperty({ format: 'uuid', description: 'Unique request ID; reuse when retrying the same sale' })
  @IsUUID('4') clientRequestId!: string;
  @ApiProperty({ enum: ['CASH', 'BANK_TRANSFER', 'POS', 'CARD', 'USSD', 'WALLET'] })
  @IsIn(['CASH', 'BANK_TRANSFER', 'POS', 'CARD', 'USSD', 'WALLET'])
  channel!: 'CASH' | 'BANK_TRANSFER' | 'POS' | 'CARD' | 'USSD' | 'WALLET';
  @ApiPropertyOptional({ format: 'uuid', description: 'Optional existing customer in the same business' })
  @IsOptional() @IsUUID('4') customerId?: string;

  @ApiProperty({ type: [SaleLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true })
  @Type(() => SaleLineDto) items!: SaleLineDto[];
}
export class SalesListQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') businessId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') branchId!: string;
}
export class ConfirmCashDto {
  @ApiProperty({ example: true, description: 'Explicit confirmation of physical cash receipt' })
  @IsIn([true]) cashReceived!: true;
}

export class ScanLookupQueryDto extends SalesListQueryDto {
  @ApiProperty({ description: 'Exact barcode or SKU, as a string to preserve leading zeroes', example: '8901234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;
}


/** Cash received on the device, but not yet included in cloud stock/revenue.
 * Only server-confirmed receipts may be marked SYNCED in the client. */
export class OfflineCashLineDto extends SaleLineDto {
  @ApiProperty({ example: "1200.00", description: "Price shown and collected while offline, in NGN" })
  @IsString() @Matches(/^(?:0|[1-9]\d{0,10})\.\d{2}$/)
  unitPrice!: string;
}

export class OfflineCashSaleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') businessId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') branchId!: string;
  @ApiProperty({ format: 'uuid', description: 'Stable UUID generated before saving the sale locally' })
  @IsUUID('4') clientRequestId!: string;
  @ApiProperty({ example: '2026-11-11T17:00:00.000Z' })
  @IsISO8601({ strict: true }) recordedAt!: string;
  @ApiProperty({ enum: [true], description: 'Cash physically collected by the cashier' })
  @IsIn([true]) cashReceived!: true;
  @ApiProperty({ type: [OfflineCashLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true })
  @Type(() => OfflineCashLineDto) items!: OfflineCashLineDto[];
}
