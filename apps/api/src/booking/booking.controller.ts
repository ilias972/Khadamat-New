import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  GetSlotsSchema,
  CreateBookingSchema,
  type GetSlotsInput,
  type CreateBookingInput,
} from '@khadamat/contracts';

/**
 * BookingController
 *
 * Controller pour la gestion des réservations.
 *
 * Routes :
 * - GET /api/public/slots : Récupérer les créneaux disponibles (PUBLIC)
 * - POST /api/bookings : Créer une réservation (PROTÉGÉ - CLIENT uniquement)
 */
@Controller()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * GET /api/public/slots
   *
   * Récupère les créneaux disponibles pour un Pro à une date donnée.
   * Route publique (pas d'authentification requise).
   *
   * Query params :
   * - proId : ID du professionnel
   * - date : Date au format YYYY-MM-DD
   * - categoryId : ID de la catégorie de service
   *
   * @returns Array de strings (ex: ["09:00", "10:00", "11:00"])
   */
  @Get('public/slots')
  async getSlots(
    @Query(new ZodValidationPipe(GetSlotsSchema)) dto: GetSlotsInput,
  ) {
    return this.bookingService.getAvailableSlots(dto);
  }

  /**
   * POST /api/bookings
   *
   * Crée une réservation pour un client.
   * Route protégée (authentification requise).
   * Seuls les utilisateurs avec le rôle CLIENT peuvent créer des réservations.
   *
   * Body :
   * - proId : ID du professionnel
   * - categoryId : ID de la catégorie de service
   * - date : Date au format YYYY-MM-DD
   * - time : Heure au format HH:MM
   *
   * @returns Booking créé avec les relations (category, pro, city)
   */
  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  async createBooking(
    @Request() req,
    @Body(new ZodValidationPipe(CreateBookingSchema)) dto: CreateBookingInput,
  ) {
    return this.bookingService.createBooking(req.user.id, req.user.role, dto);
  }
}
