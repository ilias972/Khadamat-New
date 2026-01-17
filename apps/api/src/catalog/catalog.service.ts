import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getCities(): Promise<PublicCity[]> {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getCategories(): Promise<PublicCategory[]> {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPros(filters: { cityId?: string; categoryId?: string }): Promise<PublicProCard[]> {
    const { cityId, categoryId } = filters;

    const whereClause: any = {
      role: 'PRO',
      status: 'ACTIVE',
      proProfile: { isNot: null },
    };

    if (cityId) whereClause.proProfile.cityId = cityId;

    if (categoryId) {
      whereClause.proProfile.services = {
        some: { categoryId: categoryId },
      };
    }

    const pros = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        proProfile: {
          include: {
            city: true,
            services: { include: { category: true } },
          },
        },
      },
    });

    return pros.map((pro) => this.mapToPublicProCard(pro));
  }

  async getProDetail(id: string): Promise<PublicProProfile> {
    const pro = await this.prisma.user.findUnique({
      where: { id, role: 'PRO', status: 'ACTIVE' },
      include: {
        proProfile: {
          include: {
            city: true,
            services: { include: { category: true } },
          },
        },
      },
    });

    if (!pro || !pro.proProfile) {
      throw new NotFoundException(`Pro introuvable ou inactif`);
    }

    const card = this.mapToPublicProCard(pro);

    // CORRECTION : On ne renvoie que ce qui est défini dans le contrat PublicProProfile
    return {
      ...card,
      // Si 'bio' n'existe pas dans le contrat ou la DB, on ne l'ajoute pas pour l'instant
    };
  }

  private mapToPublicProCard(user: any): PublicProCard {
    const profile = user.proProfile;
    const lastNameInitial = user.lastName ? `${user.lastName.charAt(0)}.` : '';
    
    // Privacy Shield : Nom masqué
    const displayName = `${user.firstName} ${lastNameInitial}`.trim();

    const servicesFormatted = profile.services.map((s: any) => {
      let priceText = 'Prix sur devis';
      if (s.pricingType === 'FIXED' && s.price) {
        priceText = `${s.price} MAD`;
      } else if (s.pricingType === 'RANGE' && s.minPrice) {
        priceText = s.maxPrice 
          ? `De ${s.minPrice} à ${s.maxPrice} MAD`
          : `À partir de ${s.minPrice} MAD`;
      }

      return {
        name: s.category?.name || 'Service',
        priceFormatted: priceText,
      };
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: lastNameInitial,
      city: profile.city?.name || 'Maroc',
      isVerified: profile.kycStatus === 'APPROVED',
      services: servicesFormatted,
      // CORRECTION : Suppression de 'rating' car il n'est pas dans le contrat
    };
  }
}
