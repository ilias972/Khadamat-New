import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

/**
 * PaymentController - Version MANUAL (MVP)
 *
 * Gère les paiements manuels pour Premium et Boost.
 *
 * Routes :
 * - POST /api/payment/checkout : Créer une demande de paiement (PRO)
 * - GET  /api/payment/status/:oid : Vérifier le statut d'un paiement (PRO)
 * - POST /api/payment/admin/confirm/:oid : Valider un paiement (ADMIN)
 * - POST /api/payment/admin/reject/:oid : Rejeter un paiement (ADMIN)
 * - GET  /api/payment/admin/pending : Liste des paiements en attente (ADMIN)
 */
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /api/payment/checkout
   *
   * Crée une demande de paiement manuel.
   * Retourne une référence et les instructions de paiement.
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
   * GET /api/payment/status/:oid
   *
   * Récupère le statut d'un paiement.
   *
   * @Guard PRO uniquement
   */
  @Get('status/:oid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRO')
  async getPaymentStatus(@Param('oid') oid: string, @Request() req) {
    return this.paymentService.getPaymentStatus(oid, req.user.id);
  }

  /**
   * POST /api/payment/admin/confirm/:oid
   *
   * [ADMIN] Valide manuellement un paiement après vérification.
   * Active automatiquement le plan associé.
   *
   * @Guard ADMIN uniquement
   */
  @Post('admin/confirm/:oid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async confirmPayment(
    @Param('oid') oid: string,
    @Body() body: { adminNotes?: string },
  ) {
    return this.paymentService.confirmPayment(oid, body.adminNotes);
  }

  /**
   * POST /api/payment/admin/reject/:oid
   *
   * [ADMIN] Rejette un paiement en attente.
   *
   * @Guard ADMIN uniquement
   */
  @Post('admin/reject/:oid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectPayment(
    @Param('oid') oid: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentService.rejectPayment(oid, body.reason);
  }

  /**
   * GET /api/payment/admin/pending
   *
   * [ADMIN] Liste tous les paiements en attente de validation.
   *
   * @Guard ADMIN uniquement
   */
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getPendingPayments(
    @Query('page') rawPage?: string,
    @Query('limit') rawLimit?: string,
  ) {
    const page = rawPage ? Number(rawPage) : 1;
    const limit = rawLimit ? Number(rawLimit) : 20;
    if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Paramètres de pagination invalides');
    }
    return this.paymentService.getPendingPayments(page, limit);
  }
}
