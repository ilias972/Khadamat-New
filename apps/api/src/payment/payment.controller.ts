import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CmiCallbackDto } from './dto/cmi-callback.dto';

/**
 * PaymentController
 *
 * Gère les paiements CMI (Maroc) pour Premium et Boost.
 *
 * Routes :
 * - POST /api/payment/checkout : Initier un paiement (PRO authentifié)
 * - POST /api/payment/callback : Callback CMI (Public, appelé par CMI)
 */
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /api/payment/checkout
   *
   * Initie un paiement CMI.
   * Retourne l'URL d'action et les champs du formulaire à soumettre.
   *
   * @Guard PRO uniquement
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRO')
  async initiatePayment(
    @Request() req: any,
    @Body(new ValidationPipe()) dto: InitiatePaymentDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID introuvable dans le token');
    }
    return this.paymentService.initiatePayment(userId, dto);
  }

  /**
   * POST /api/payment/callback
   *
   * Callback appelé par CMI après le paiement.
   * Traite le paiement et active le plan si succès.
   *
   * @Public (appelé par CMI, pas d'auth)
   */
  @Post('callback')
  async handleCallback(@Body(new ValidationPipe()) payload: CmiCallbackDto) {
    return this.paymentService.handleCallback(payload);
  }
}
