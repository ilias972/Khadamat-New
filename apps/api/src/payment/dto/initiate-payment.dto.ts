import { IsString, IsIn, IsOptional } from 'class-validator';
import { PlanType, PAYMENT_PLANS } from '../utils/payment.constants';

export class InitiatePaymentDto {
  @IsString()
  @IsIn(['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL', 'BOOST'])
  planType: PlanType;

  // Requis uniquement pour BOOST
  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
