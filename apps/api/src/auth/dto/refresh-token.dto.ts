import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @MinLength(40, { message: 'Refresh token invalide' })
  refreshToken?: string;
}
