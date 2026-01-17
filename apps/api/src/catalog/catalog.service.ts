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

    const whereClause: any = {
      role: 'PRO',
      status: 'ACTIVE',
      proProfile: { isNot: null },
    };

    if (cityId) whereClause.proProfile.cityId = cityId;

    if (categoryId) {
      // TENTATIVE DE FIX : J'utilise 'proServices' ici car c'est souvent le nom par défaut dans Prisma
      // Si ça recrashe, remplace 'proServices' par 'services' ci-dessous
      whereClause.proProfile.services = {
        some: { categoryId: categoryId },
      };
    }

    try {
      const pros = await this.prisma.user.findMany({
        where: whereClause,
        include: {
          proProfile: {
            include: {
              city: true,
              // Ici aussi, vérifie ton schema.prisma : est-ce 'services' ou 'proServices' ?
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

    // LOG POUR DEBUGGER LE PRIX
    // Regarde ce qui s'affiche dans ton terminal API !
    if (profile.services && profile.services.length > 0) {
      this.logger.debug(`💰 Service data pour ${displayName}: ${JSON.stringify(profile.services[0])}`);
    }

    const servicesFormatted = profile.services.map((s: any) => {
      let priceText = 'Prix sur devis';
      
      // On teste les valeurs en étant souple
      if (s.pricingType === 'FIXED' && s.price) {
        priceText = `${s.price} MAD`;
      } 
      else if (s.pricingType === 'RANGE') {
        if (s.minPrice && s.maxPrice) {
          priceText = `De ${s.minPrice} à ${s.maxPrice} MAD`;
        } else if (s.minPrice) {
          priceText = `À partir de ${s.minPrice} MAD`;
        }
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
    };
  }
}
