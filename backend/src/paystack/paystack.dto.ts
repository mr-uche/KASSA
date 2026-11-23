import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InitializePaystackDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') saleId!: string;
  @ApiProperty({ example: 'customer@example.com', description: 'Customer email for hosted Paystack test checkout' })
  @IsEmail() @MaxLength(254) email!: string;
}

export class VerifyPaystackDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') saleId!: string;
}

export class ReconcilePaystackDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') businessId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') branchId!: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 5 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) limit?: number;
}
