import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResubmitKycDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'cinNumber must contain only letters and digits',
  })
  cinNumber!: string;
}
