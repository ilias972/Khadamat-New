import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * CatalogResolverService
 *
 * Service partagé pour résoudre les publicId en id internes.
 * Remplace les méthodes resolveCityId/resolveCategoryId dupliquées
 * dans CatalogService, BookingService, PaymentService, ProService.
 */
@Injectable()
export class CatalogResolverService {
  constructor(private prisma: PrismaService) {}

  async resolveCityId(publicId: string): Promise<string> {
    const city = await this.prisma.city.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!city) {
      throw new NotFoundException('CITY_NOT_FOUND');
    }
    return city.id;
  }

  async resolveCategoryId(publicId: string): Promise<string> {
    const category = await this.prisma.category.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return category.id;
  }
}
