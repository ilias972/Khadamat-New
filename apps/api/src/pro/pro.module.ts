import { Module } from '@nestjs/common';
import { ProController } from './pro.controller';
import { ProService } from './pro.service';
import { SubscriptionExpirationService } from './subscription-expiration.service';
import { DatabaseModule } from '../database/database.module';
import { CatalogResolverModule } from '../catalog/catalog-resolver.module';

@Module({
  imports: [DatabaseModule, CatalogResolverModule],
  controllers: [ProController],
  providers: [ProService, SubscriptionExpirationService],
  exports: [ProService],
})
export class ProModule {}
