import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional } from 'class-validator';

export const EXPORT_SECTIONS = [
  'transactions', 'productsInventory', 'customers', 'staff', 'branches', 'reportsAnalytics',
] as const;
export type ExportSectionKey = (typeof EXPORT_SECTIONS)[number];

export class ExportBusinessDto {
  @ApiProperty({ enum: EXPORT_SECTIONS, isArray: true })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsIn(EXPORT_SECTIONS, { each: true })
  sections!: ExportSectionKey[];

  @ApiPropertyOptional({ enum: ['ALL', 'LAST_30_DAYS', 'LAST_90_DAYS', 'THIS_YEAR'] })
  @IsOptional()
  @IsIn(['ALL', 'LAST_30_DAYS', 'LAST_90_DAYS', 'THIS_YEAR'])
  dateRange?: 'ALL' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_YEAR';
}
