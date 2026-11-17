import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendSupportMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body!: string;
}
