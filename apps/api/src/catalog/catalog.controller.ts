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

function isEntityId(value: string): boolean {
  return /^(city|cat)_[a-z]+_\d{3}$/i.test(value);
}

function parsePremiumQuery(value?: string): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new BadRequestException('premium invalide (true|false)');
}

function parseMinRatingQuery(value?: string): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new BadRequestException('minRating invalide');
  }
  if (parsed < 0 || parsed > 5) {
    throw new BadRequestException('minRating doit être entre 0 et 5');
  }
  if (!Number.isInteger(parsed * 2)) {
    throw new BadRequestException('minRating doit être un multiple de 0.5');
  }

  return parsed;
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
    if (cityId && !isEntityId(cityId)) {
      throw new BadRequestException('cityId invalide');
    }
    if (categoryId && !isEntityId(categoryId)) {
      throw new BadRequestException('categoryId invalide');
    }
    return this.catalogService.getPros({ cityId, categoryId }, page, limit);
  }

  @Get('pros/v2')
  @ApiOperation({ summary: 'Rechercher des professionnels v2 (pagination + tri monétisation)' })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'premium', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'minRating', required: false, description: '0..5 par pas de 0.5' })
  @ApiResponse({ status: 200, description: 'Liste paginée avec meta' })
  getProsV2(
    @Query('cityId') cityId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') rawPage?: string,
    @Query('limit') rawLimit?: string,
    @Query('premium') rawPremium?: string,
    @Query('minRating') rawMinRating?: string,
  ) {
    const page = rawPage ? Number(rawPage) : 1;
    const limit = rawLimit ? Number(rawLimit) : 20;
    const premium = parsePremiumQuery(rawPremium);
    const minRating = parseMinRatingQuery(rawMinRating);

    if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1 || limit > 50) {
      throw new BadRequestException('Paramètres de pagination invalides');
    }
    if (cityId && !isEntityId(cityId)) {
      throw new BadRequestException('cityId invalide');
    }
    if (categoryId && !isEntityId(categoryId)) {
      throw new BadRequestException('categoryId invalide');
    }
    return this.catalogService.getProsV2({ cityId, categoryId, premium, minRating }, page, limit);
  }

  @Get('pros/:id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Détail public d'un professionnel" })
  getPro(@Param('id') id: string, @Request() req: any): Promise<PublicProProfile> {
    return this.catalogService.getProDetail(id, req.user?.id);
  }
}
