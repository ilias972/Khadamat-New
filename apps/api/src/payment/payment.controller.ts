import {
  Controller,
  Post,
  Body,
  Request,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateCheckoutSessionSchema,
  type CreateCheckoutSessionInput,
  type CheckoutSessionResponse,
} from '@khadamat/contracts';

/**
 * PaymentController
 *
 * Controller pour gérer les paiements Stripe.
 *
 * Routes :
 * - POST /api/payment/checkout : Créer une session Stripe Checkout (PRO uniquement)
 * - POST /api/payment/webhook : Recevoir les webhooks Stripe (public)
 */
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /api/payment/checkout
   *
   * Crée une session Stripe Checkout pour un PRO.
   * Retourne sessionId et URL de redirection.
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRO')
  async createCheckout(
    @Request() req,
    @Body(new ZodValidationPipe(CreateCheckoutSessionSchema))
    dto: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResponse> {
    return this.paymentService.createCheckoutSession(
      req.user.id,
      req.user.role,
      dto,
    );
  }

  /**
   * POST /api/payment/webhook
   *
   * Endpoint pour recevoir les webhooks Stripe.
   * CRITIQUE : Nécessite le raw body pour vérifier la signature.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Request() req,
  ): Promise<{ received: boolean }> {
    // Le rawBody a été capturé dans main.ts via le middleware verify
    const rawBody = req.rawBody || JSON.stringify(req.body);

    await this.paymentService.handleWebhook(signature, rawBody);

    return { received: true };
  }
}
