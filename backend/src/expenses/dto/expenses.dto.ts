import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Transport', 'Marketing',
  'Maintenance', 'Office supplies', 'Professional fees', 'Other',
] as const;

export class ExpenseScopeDto {
  @IsUUID('4') businessId!: string;
  @IsOptional() @IsUUID('4') branchId?: string;
  // "all" or YYYY-MM; used for server-aggregated category analysis.
  @IsOptional() @IsString() @Matches(/^(?:all|\d{4}-(?:0[1-9]|1[0-2]))$/)
  month?: string;
}

export class CreateExpenseDto {
  @IsUUID('4') businessId!: string;
  @IsUUID('4') branchId!: string;
  @IsString() @Matches(/^(?:0|[1-9]\d{0,10})\.\d{2}$/)
  amount!: string;
  @IsIn(EXPENSE_CATEGORIES) category!: (typeof EXPENSE_CATEGORIES)[number];
  @IsString() @IsNotEmpty() @MaxLength(500) description!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  spentAt!: string;
}
