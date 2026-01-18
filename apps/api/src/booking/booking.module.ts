import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { DatabaseModule } from '../database/database.module';

/**
 * BookingModule
 *
 * Module pour la gestion des réservations.
 * Fournit les endpoints pour récupérer les créneaux disponibles et créer des réservations.
 *
 * Imports :
 * - DatabaseModule : Pour accéder à PrismaService
 *
 * Controllers :
 * - BookingController : Endpoints GET /public/slots et POST /bookings
 *
 * Providers :
 * - BookingService : Logique métier pour le calcul de disponibilité et la création de réservations
 */
@Module({
  imports: [DatabaseModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
