import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
  IsOptional,
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

  @IsString({ message: 'cityId est requis' })
  @MinLength(1, { message: 'cityId est requis' })
  @Matches(/^city_[a-z]+_\d{3}$/, { message: 'cityId invalide' })
  cityId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "L'adresse ne peut pas dépasser 200 caractères" })
  addressLine?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{1,2}\d{5,6}$/, {
    message: 'Format CIN invalide (ex: BJ453975)',
  })
  cinNumber?: string;
}
