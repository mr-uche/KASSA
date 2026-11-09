import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn,
  IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength,
} from 'class-validator';

export const ROLE_PERMISSIONS = [
  'View dashboard',
  'Manage sales & transactions',
  'Manage products & inventory',
  'View reports & analytics',
  'Manage customers',
] as const;

export class BusinessScopeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  businessId!: string;
}

export class CreateBranchDto extends BusinessScopeDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateRoleDto extends BusinessScopeDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiProperty({ type: [String], enum: [...ROLE_PERMISSIONS] })
  @IsArray() @ArrayUnique() @ArrayMaxSize(ROLE_PERMISSIONS.length)
  @IsIn(ROLE_PERMISSIONS, { each: true })
  permissions!: string[];
}

export class CreateInvitationDto extends BusinessScopeDto {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) fullName!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') roleId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') branchId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) message?: string;
}

export class InvitationTokenDto {
  @ApiProperty({ description: 'One-time opaque invitation token' })
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/)
  token!: string;
}

export class RegisterInvitationDto extends InvitationTokenDto {
  @ApiProperty({ writeOnly: true })
  @IsString() @MinLength(12) @MaxLength(128)
  password!: string;
}

export class UpdateStaffDto extends BusinessScopeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') roleId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') branchId!: string;
}
