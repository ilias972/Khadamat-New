import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingExpirationService } from './booking-expiration.service';
import { DatabaseModule } from '../database/database.module';
import { CatalogResolverModule } from '../catalog/catalog-resolver.module';

@Module({
  imports: [DatabaseModule, CatalogResolverModule],
  controllers: [BookingController],
  providers: [BookingService, BookingExpirationService],
  exports: [BookingService],
})
export class BookingModule {}
