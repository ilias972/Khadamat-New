import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit contenir au moins 10 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  @Matches(/[a-z]/, { message: 'Le mot de passe doit contenir au moins une minuscule' })
  @Matches(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une majuscule' })
  @Matches(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
  password: string;

  @IsString()
  @Matches(/^(\+212|0)[5-7]\d{8}$/, {
    message: 'Numéro de téléphone marocain invalide (ex: 0612345678 ou +212612345678)',
  })
  phone: string;

  @IsIn(['CLIENT', 'PRO'], { message: 'Le rôle doit être CLIENT ou PRO' })
  role: 'CLIENT' | 'PRO';

  @IsString()
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(50)
  lastName: string;

  @IsUUID('4', { message: 'cityId doit être un UUID valide' })
  cityId: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  cinNumber?: string;
}
