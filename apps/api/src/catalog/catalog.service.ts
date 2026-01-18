import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private prisma: PrismaService) {}

  async getCities(): Promise<PublicCity[]> {
    return this.prisma.city.findMany({ orderBy: { name: 'asc' } });
  }

  async getCategories(): Promise<PublicCategory[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async getPros(filters: { cityId?: string; categoryId?: string }): Promise<PublicProCard[]> {
    const { cityId, categoryId } = filters;
    this.logger.log(`🔍 Recherche Pro avec filtres: City=${cityId}, Cat=${categoryId}`);

    // 1. On prépare les conditions de filtrage sur le profil
    const profileConditions: any = {};

    if (cityId) {
      profileConditions.cityId = cityId;
    }

    if (categoryId) {
      // NOTE: D'après tes logs, la relation s'appelle bien 'services'
      profileConditions.services = {
        some: { categoryId: categoryId },
      };
    }

    // 2. On construit la requête principale
    const whereClause: any = {
      role: 'PRO',
      status: 'ACTIVE',
    };

    // LOGIQUE DE FILTRAGE ROBUSTE :
    // - Si on a des critères (Ville/Cat), on utilise 'is' pour filtrer le profil.
    // - Sinon, on utilise 'isNot: null' juste pour s'assurer que le pro a un profil.
    if (Object.keys(profileConditions).length > 0) {
      whereClause.proProfile = {
        is: profileConditions
      };
    } else {
      whereClause.proProfile = {
        isNot: null
      };
    }

    try {
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

      this.logger.log(`✅ ${pros.length} pros trouvés`);
      return pros.map((pro) => this.mapToPublicProCard(pro));

    } catch (error) {
      this.logger.error(`❌ ERREUR PRISMA: ${error.message}`);
      throw error;
    }
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
      throw new NotFoundException(`Pro introuvable`);
    }

    return this.mapToPublicProCard(pro) as PublicProProfile;
  }

  private mapToPublicProCard(user: any): PublicProCard {
    const profile = user.proProfile;
    const lastNameInitial = user.lastName ? `${user.lastName.charAt(0)}.` : '';
    const displayName = `${user.firstName} ${lastNameInitial}`.trim();

    // Debug des prix si besoin
    if (profile.services && profile.services.length > 0) {
       // this.logger.debug(`Price data: ${JSON.stringify(profile.services[0])}`);
    }

    const servicesFormatted = profile.services.map((s: any) => {
      let priceText = 'Prix sur devis';

      if (s.pricingType === 'FIXED' && s.fixedPriceMad) {
        priceText = `${s.fixedPriceMad} MAD`;
      }
      else if (s.pricingType === 'RANGE') {
        if (s.minPriceMad && s.maxPriceMad) {
          priceText = `De ${s.minPriceMad} à ${s.maxPriceMad} MAD`;
        } else if (s.minPriceMad) {
          priceText = `À partir de ${s.minPriceMad} MAD`;
        }
      }

      return {
        name: s.category?.name || 'Service',
        priceFormatted: priceText,
        categoryId: s.categoryId, // Ajout du categoryId pour le booking
      };
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: lastNameInitial,
      city: profile.city?.name || 'Maroc',
      isVerified: profile.kycStatus === 'APPROVED',
      services: servicesFormatted,
    };
  }
}
