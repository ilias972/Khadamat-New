import { Module } from '@nestjs/common';
import { CatalogResolverService } from './catalog-resolver.service';
import { DatabaseModule } from '../database/database.module';

/**
 * CatalogResolverModule
 *
 * Module partagé exportant CatalogResolverService.
 * Importé par BookingModule, PaymentModule, ProModule, CatalogModule.
 */
@Module({
  imports: [DatabaseModule],
  providers: [CatalogResolverService],
  exports: [CatalogResolverService],
})
export class CatalogResolverModule {}
