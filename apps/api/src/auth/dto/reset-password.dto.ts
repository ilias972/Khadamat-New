import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token (hex string)' })
  @IsString({ message: 'Token requis' })
  @Matches(/^[a-f0-9]{64,128}$/, {
    message: 'Token invalide',
  })
  token: string;

  @ApiProperty({ description: 'New password (10-128 chars, 1 lowercase, 1 uppercase, 1 digit)' })
  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit contenir au moins 10 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  @Matches(/[a-z]/, { message: 'Le mot de passe doit contenir au moins une minuscule' })
  @Matches(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une majuscule' })
  @Matches(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
  newPassword: string;
}
