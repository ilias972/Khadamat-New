import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PublicStatsController } from './stats.controller';

@Module({
  imports: [
    CacheModule.register(),
  ],
  controllers: [CatalogController, PublicStatsController],
  providers: [CatalogService],
})
export class CatalogModule {}
