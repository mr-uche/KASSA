import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID,
  Matches, Max, MaxLength, Min,
} from 'class-validator';

export class InventoryScopeQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  businessId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;
}

export class CategoryCreateDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  businessId!: string;

  @ApiProperty({ example: 'Medicines' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductCreateDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  businessId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'Vitamin C 1000mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'VIT-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku!: string;

  @ApiPropertyOptional({ example: '8901234567890', description: 'Barcode / GTIN printed on the product' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Decimal strings prevent floating-point coercion of currency values.
  @ApiProperty({ example: '6500.00', type: String })
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  sellingPrice!: string;

  @ApiPropertyOptional({ example: '4000.00', type: String })
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  costPrice?: string;

  @ApiProperty({ minimum: 0, type: Number })
  @IsInt()
  @Min(0)
  @Max(100000000)
  currentStock!: number;

  @ApiProperty({ minimum: 0, type: Number })
  @IsInt()
  @Min(0)
  @Max(100000000)
  lowStockThreshold!: number;
}

export class RestockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  businessId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ minimum: 1, type: Number })
  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AssignProductBarcodeDto extends InventoryScopeQueryDto {
  @ApiProperty({ example: '8901234567890', description: 'Empty string clears the barcode' })
  @IsString()
  @MaxLength(100)
  barcode!: string;
}
