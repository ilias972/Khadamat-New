import { Controller, Get, Param, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}

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
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getPros(
    @Query('cityId') cityId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') rawPage?: string,
    @Query('limit') rawLimit?: string,
  ): Promise<PublicProCard[]> {
    const page = rawPage ? Number(rawPage) : 1;
    const limit = rawLimit ? Number(rawLimit) : 20;
    if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Paramètres de pagination invalides');
    }
    return this.catalogService.getPros({ cityId, categoryId }, page, limit);
  }

  @Get('pros/:id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Détail public d'un professionnel" })
  getPro(@Param('id') id: string, @Request() req: any): Promise<PublicProProfile> {
    return this.catalogService.getProDetail(id, req.user?.id);
  }
}
