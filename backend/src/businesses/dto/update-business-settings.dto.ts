import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Only existing, authenticated business fields. No bank account edits or
// payment confirmation can occur through this DTO.
export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  businessName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  branchAddress?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  branchPhone?: string;

  @ApiPropertyOptional({ enum: ['INSTANT', 'DAILY', 'WEEKLY'] })
  @IsOptional()
  @IsIn(['INSTANT', 'DAILY', 'WEEKLY'])
  payoutSchedule?: 'INSTANT' | 'DAILY' | 'WEEKLY';
}
