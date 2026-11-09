import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ default: false, description: 'Keep signed in for up to 30 days on this device' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
