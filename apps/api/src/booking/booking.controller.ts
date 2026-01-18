import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
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
  UpdateBookingStatusSchema,
  type GetSlotsInput,
  type CreateBookingInput,
  type UpdateBookingStatusInput,
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

  /**
   * GET /api/bookings
   *
   * Récupère les réservations de l'utilisateur connecté.
   * Route protégée (authentification requise).
   *
   * Comportement selon le rôle :
   * - CLIENT : Renvoie les bookings où clientId = user.id
   * - PRO : Renvoie les bookings où proId = user.id
   *
   * @returns Array de bookings avec relations (category, city, pro/client)
   */
  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@Request() req) {
    return this.bookingService.getMyBookings(req.user.id, req.user.role);
  }

  /**
   * PATCH /api/bookings/:id/status
   *
   * Met à jour le statut d'une réservation.
   * Route protégée (authentification requise).
   * Réservé aux PRO pour leurs propres réservations.
   *
   * Contraintes :
   * - Seul le PRO propriétaire (booking.proId === user.id) peut modifier
   * - Seulement si booking.status === 'PENDING'
   * - Statuts autorisés : CONFIRMED, DECLINED
   *
   * Body :
   * - status : 'CONFIRMED' | 'DECLINED'
   *
   * @returns Booking mis à jour
   */
  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateBookingStatus(
    @Param('id') id: string,
    @Request() req,
    @Body(new ZodValidationPipe(UpdateBookingStatusSchema)) dto: UpdateBookingStatusInput,
  ) {
    return this.bookingService.updateBookingStatus(id, req.user.id, req.user.role, dto);
  }
}
