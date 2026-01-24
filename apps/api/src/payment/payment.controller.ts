import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  ValidationPipe,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
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
  constructor(
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
  ) {}

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
   * Traite le paiement, active le plan si succès, puis redirige vers le frontend.
   *
   * @Public (appelé par CMI, pas d'auth)
   */
  @Post('callback')
  async handleCallback(
    @Body(new ValidationPipe()) payload: CmiCallbackDto,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      console.error('FRONTEND_URL n\'est pas configurée');
      return res.status(500).send('Configuration serveur manquante');
    }

    try {
      // Traiter le paiement
      const result = await this.paymentService.handleCallback(payload);

      // Construire l'URL de redirection selon le résultat
      const oid = payload.oid || 'unknown';

      if (result.status === 'success') {
        // Succès : Redirige vers la page de succès
        const redirectUrl = `${frontendUrl}/pro/subscription?status=success&oid=${encodeURIComponent(oid)}`;
        console.log(`✅ Paiement réussi, redirection vers: ${redirectUrl}`);
        return res.redirect(redirectUrl);
      } else {
        // Échec : Redirige vers la page d'échec avec détails
        const errorMsg = payload.ErrMsg || payload.Response || 'Paiement échoué';
        const redirectUrl = `${frontendUrl}/pro/subscription?status=failed&error=${encodeURIComponent(errorMsg)}&oid=${encodeURIComponent(oid)}`;
        console.log(`❌ Paiement échoué, redirection vers: ${redirectUrl}`);
        return res.redirect(redirectUrl);
      }
    } catch (error: any) {
      // Erreur lors du traitement : Redirige vers page d'erreur
      const oid = payload.oid || 'unknown';
      const errorMsg = error.message || 'Erreur serveur';
      const redirectUrl = `${frontendUrl}/pro/subscription?status=error&error=${encodeURIComponent(errorMsg)}&oid=${encodeURIComponent(oid)}`;
      console.error(`💥 Erreur callback CMI:`, error);
      return res.redirect(redirectUrl);
    }
  }
}
