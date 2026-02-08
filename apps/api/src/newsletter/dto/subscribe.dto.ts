import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254, { message: 'Adresse e-mail trop longue' })
  email: string;
}
