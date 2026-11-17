import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateMerchantBankAccountDto {
  @ApiProperty({ example: 'Any Nigerian bank or licensed receiving institution' })
  @IsString() @IsNotEmpty() @MaxLength(120)
  bankName!: string;

  @ApiProperty({ example: '0123456789' })
  @Matches(/^\d{10}$/)
  accountNumber!: string;

  @ApiProperty({ description: 'Name entered by the merchant owner; bank verification is NOT performed yet' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  accountName!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsIn([true, false])
  isDefault?: boolean;
}

export class UpdateMerchantBankAccountDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{10}$/)
  accountNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  accountName?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn([true, false])
  isDefault?: boolean;
}
