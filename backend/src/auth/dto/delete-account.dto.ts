import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Current password required immediately before account closure' })
  @IsString() @MinLength(1) @MaxLength(128) password!: string;

  @ApiProperty({ example: 'DELETE ACCOUNT', description: 'Exact confirmation phrase' })
  @IsIn(['DELETE ACCOUNT']) confirmation!: 'DELETE ACCOUNT';
}
