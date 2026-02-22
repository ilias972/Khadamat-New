import {
  IsEmail,
  IsString,
  Matches,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ForgotPasswordDto
 *
 * Exactly ONE of email or phone must be provided (XOR).
 * Validation: if both are provided or neither, class-validator will reject.
 */
export class ForgotPasswordDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'Email invalide' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '0612345678' })
  @ValidateIf((o) => !o.email)
  @IsString({ message: 'Numéro de téléphone requis' })
  @Matches(/^(\+212|0)[5-7]\d{8}$/, {
    message: 'Numéro de téléphone marocain invalide (ex: 0612345678 ou +212612345678)',
  })
  @IsOptional()
  phone?: string;
}
