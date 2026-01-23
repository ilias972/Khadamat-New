import { IsString, IsOptional } from 'class-validator';

export class CmiCallbackDto {
  @IsString()
  oid: string;

  @IsString()
  @IsOptional()
  ProcReturnCode?: string;

  @IsString()
  @IsOptional()
  Response?: string;

  @IsString()
  @IsOptional()
  TransId?: string;

  @IsString()
  @IsOptional()
  HASH?: string;

  // CMI peut envoyer d'autres champs, on les accepte tous
  [key: string]: any;
}
