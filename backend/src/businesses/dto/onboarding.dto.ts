import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsNotEmpty,
  IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchOnboardingDto {
  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Wuse II, Abuja' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class StaffDraftDto {
  @ApiProperty({ example: 'Ifeoma Bassey' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'Cashier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  role!: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class OnboardingDto {
  @ApiProperty({ example: 'Adebola Pharmacy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  businessName!: string;

  @ApiPropertyOptional({ example: 'Pharmacy' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessType?: string;

  @ApiPropertyOptional({ example: 'Adebola Pharmacy Limited' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  registeredName?: string;

  @ApiPropertyOptional({ example: 6, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  staffCount?: number;

  @ApiProperty({ type: [BranchOnboardingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BranchOnboardingDto)
  branches!: BranchOnboardingDto[];

  @ApiPropertyOptional({ enum: ['instant', 'daily', 'weekly'] })
  @IsOptional()
  @IsIn(['instant', 'daily', 'weekly'])
  payoutSchedule?: 'instant' | 'daily' | 'weekly';

  @ApiPropertyOptional({ example: 'GTBank', description: 'Saved as unverified payout preference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  settlementBank?: string;

  @ApiPropertyOptional({ example: '0123456789', description: 'Only the last four digits will be saved; payouts stay disabled until verification.' })
  @IsOptional()
  @Matches(/^\d{10}$/)
  accountNumber?: string;

  @ApiPropertyOptional({ type: [StaffDraftDto], description: 'Staff names saved as drafts, not active user accounts' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StaffDraftDto)
  staff?: StaffDraftDto[];
}
