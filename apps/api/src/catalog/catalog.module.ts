import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

/**
 * CatalogModule
 *
 * Module PUBLIC pour la découverte du marketplace.
 * Endpoints accessibles sans authentification.
 */
@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
