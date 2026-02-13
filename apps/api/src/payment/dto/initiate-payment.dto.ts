import { IsString, IsIn, IsOptional, Matches } from 'class-validator';
import { PaymentOrderPlanType } from '../types/prisma-enums';

export class InitiatePaymentDto {
  @IsString()
  @IsIn([PaymentOrderPlanType.PREMIUM_MONTHLY, PaymentOrderPlanType.PREMIUM_ANNUAL, PaymentOrderPlanType.BOOST])
  planType: PaymentOrderPlanType;

  // Requis uniquement pour BOOST
  @IsOptional()
  @IsString()
  @Matches(/^city_[a-z]+_\d{3}$/, { message: 'cityId invalide' })
  cityId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^cat_[a-z]+_\d{3}$/, { message: 'categoryId invalide' })
  categoryId?: string;
}
