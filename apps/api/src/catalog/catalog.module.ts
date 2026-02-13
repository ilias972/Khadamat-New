import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PublicStatsController } from './stats.controller';
import { CatalogResolverModule } from './catalog-resolver.module';

@Module({
  imports: [
    CacheModule.register(),
    CatalogResolverModule,
  ],
  controllers: [CatalogController, PublicStatsController],
  providers: [CatalogService],
})
export class CatalogModule {}
