import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

/**
 * CatalogController
 *
 * Endpoints PUBLICS pour la découverte du marketplace.
 * Pas d'Auth Guard requis.
 *
 * ⚠️ PRIVACY SHIELD ACTIF ⚠️
 * Tous les endpoints respectent les règles de confidentialité.
 */
@ApiTags('Public Catalog')
@Controller('public')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * GET /api/public/cities
   * Liste toutes les villes disponibles sur la plateforme
   */
  @Get('cities')
  @ApiOperation({ summary: 'Liste toutes les villes' })
  @ApiResponse({ status: 200, description: 'Liste des villes' })
  async getCities(): Promise<PublicCity[]> {
    return this.catalogService.getCities();
  }

  /**
   * GET /api/public/categories
   * Liste toutes les catégories de services
   */
  @Get('categories')
  @ApiOperation({ summary: 'Liste toutes les catégories de services' })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  async getCategories(): Promise<PublicCategory[]> {
    return this.catalogService.getCategories();
  }

  /**
   * GET /api/public/pros
   * Liste des Pros actifs avec filtres optionnels
   *
   * Query params:
   * - cityId (optionnel): Filtrer par ville
   * - categoryId (optionnel): Filtrer par catégorie de service
   */
  @Get('pros')
  @ApiOperation({ summary: 'Liste des Pros avec filtres optionnels' })
  @ApiQuery({ name: 'cityId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des Pros' })
  async getPros(
    @Query('cityId') cityId?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<PublicProCard[]> {
    return this.catalogService.getPros(cityId, categoryId);
  }

  /**
   * GET /api/public/pros/:id
   * Détail public d'un Pro spécifique
   */
  @Get('pros/:id')
  @ApiOperation({ summary: 'Détail public d\'un Pro' })
  @ApiResponse({ status: 200, description: 'Profil public du Pro' })
  @ApiResponse({ status: 404, description: 'Pro non trouvé' })
  async getProProfile(@Param('id') id: string): Promise<PublicProProfile> {
    return this.catalogService.getProProfile(id);
  }
}
