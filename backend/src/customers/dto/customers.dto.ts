import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength,
} from 'class-validator';

export class CustomersScopeDto {
  @ApiProperty({ format: 'uuid', description: 'Business whose customers are being accessed' })
  @IsUUID('4')
  businessId!: string;
}

export class CreateCustomerDto extends CustomersScopeDto {
  @ApiProperty({ example: 'Jane Okoro' })
  @IsString() @IsNotEmpty() @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '08012345678' })
  @IsString() @Matches(/^\+?[0-9 ()-]{7,24}$/)
  phone!: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional() @IsEmail() @MaxLength(254)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1500)
  notes?: string;
}

export class UpdateCustomerDto extends CustomersScopeDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Matches(/^\+?[0-9 ()-]{7,24}$/)
  phone?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsEmail() @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(1000)
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(1500)
  notes?: string | null;
}
