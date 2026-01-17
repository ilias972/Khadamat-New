import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

@ApiTags('Public Catalog')
@Controller('public')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('cities')
  @ApiOperation({ summary: 'Lister toutes les villes disponibles' })
  getCities(): Promise<PublicCity[]> {
    return this.catalogService.getCities();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lister toutes les catégories de services' })
  getCategories(): Promise<PublicCategory[]> {
    return this.catalogService.getCategories();
  }

  @Get('pros')
  @ApiOperation({ summary: 'Rechercher des professionnels (Filtres)' })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  getPros(
    @Query('cityId') cityId?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<PublicProCard[]> {
    // CORRECTION ICI : On passe un objet unique au service
    return this.catalogService.getPros({ cityId, categoryId });
  }

  @Get('pros/:id')
  @ApiOperation({ summary: 'Détail public d’un professionnel' })
  getPro(@Param('id') id: string): Promise<PublicProProfile> {
    // CORRECTION ICI : Le nom de la méthode est getProDetail
    return this.catalogService.getProDetail(id);
  }
}
