import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateIf,
  IsUrl,
} from 'class-validator';

const MOROCCAN_PHONE_REGEX = /^(06|07)\d{8}$/;
const CITY_PUBLIC_ID_REGEX = /^city_[a-z]+_\d{3}$/;

export class UpdateProProfileDto {
  @IsOptional()
  @IsString()
  @Matches(MOROCCAN_PHONE_REGEX, {
    message: 'phone must match format 06XXXXXXXX or 07XXXXXXXX',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(CITY_PUBLIC_ID_REGEX, { message: 'cityId invalide' })
  cityId?: string;

  @IsOptional()
  @IsString()
  @Matches(MOROCCAN_PHONE_REGEX, {
    message: 'whatsapp must match format 06XXXXXXXX or 07XXXXXXXX',
  })
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUrl(
    { require_protocol: true },
    { message: 'avatarUrl must be a valid URL' },
  )
  avatarUrl?: string | null;
}
