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

  /**
   * PATCH /api/bookings/:id/duration
   *
   * Permet au PRO de modifier la durée d'une réservation PENDING.
   * Route protégée (authentification requise).
   * Réservé aux PRO pour leurs propres réservations.
   *
   * Contraintes :
   * - Seul le PRO propriétaire peut modifier
   * - Seulement si booking.status === 'PENDING'
   * - Une seule modification autorisée (isModifiedByPro === false)
   * - Vérifie la disponibilité des créneaux consécutifs si duration > 1h
   *
   * Body :
   * - duration : number (1-8)
   *
   * @returns Booking mis à jour avec status WAITING_FOR_CLIENT
   */
  @Patch('bookings/:id/duration')
  @UseGuards(JwtAuthGuard)
  async updateBookingDuration(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { duration: number },
  ) {
    return this.bookingService.updateBooking(id, req.user.id, req.user.role, body.duration);
  }

  /**
   * PATCH /api/bookings/:id/respond
   *
   * Permet au CLIENT de répondre à une modification de durée proposée par le PRO.
   * Route protégée (authentification requise).
   * Réservé aux CLIENT pour leurs propres réservations.
   *
   * Contraintes :
   * - Seul le CLIENT propriétaire peut répondre
   * - Seulement si booking.status === 'WAITING_FOR_CLIENT'
   *
   * Body :
   * - accept : boolean (true = accepter, false = refuser)
   *
   * @returns Booking mis à jour avec status CONFIRMED ou DECLINED
   */
  @Patch('bookings/:id/respond')
  @UseGuards(JwtAuthGuard)
  async respondToModification(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { accept: boolean },
  ) {
    return this.bookingService.respondToModification(id, req.user.id, req.user.role, body.accept);
  }

  /**
   * PATCH /api/bookings/:id/complete
   *
   * Permet au PRO de marquer une réservation CONFIRMED comme COMPLETED.
   * Route protégée (authentification requise).
   * Réservé aux PRO pour leurs propres réservations.
   *
   * Contraintes :
   * - Seul le PRO propriétaire peut marquer comme terminé
   * - Seulement si booking.status === 'CONFIRMED'
   * - Le créneau doit être dans le passé
   *
   * @returns Booking mis à jour avec status COMPLETED
   */
  @Patch('bookings/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeBooking(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.bookingService.completeBooking(id, req.user.id, req.user.role);
  }
}
