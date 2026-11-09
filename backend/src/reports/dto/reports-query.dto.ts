import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

export class ReportsQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  businessId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Omit for all permitted branches' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiProperty({ example: '2026-11-01', description: 'Start calendar date in Africa/Lagos' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({ example: '2026-11-09', description: 'Inclusive end calendar date in Africa/Lagos' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @ApiProperty({ enum: ['day', 'week', 'month'] })
  @IsIn(['day', 'week', 'month'])
  granularity!: 'day' | 'week' | 'month';
}
