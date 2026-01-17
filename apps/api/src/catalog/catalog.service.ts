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

    // Construction dynamique des critères de filtrage
    const proProfileFilter: any = {
      isNot: null, // Le profil doit exister
    };

    if (cityId) {
      proProfileFilter.cityId = cityId;
    }

    if (categoryId) {
      // NOTE IMPORTANTE: Vérifie si ta relation s'appelle 'services' ou 'proServices' dans schema.prisma
      // D'après tes logs, 'services' semble passer, sinon mets 'proServices'
      proProfileFilter.services = {
        some: { categoryId: categoryId },
      };
    }

    try {
      const pros = await this.prisma.user.findMany({
        where: {
          role: 'PRO',
          status: 'ACTIVE',
          proProfile: {
            // CORRECTION PRISMA : On utilise 'is' pour filtrer à l'intérieur de la relation 1-1
            is: proProfileFilter
          },
        },
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

    const servicesFormatted = profile.services.map((s: any) => {
      let priceText = 'Prix sur devis';
      
      // CORRECTION PRIX : On utilise les bons noms de colonnes (minPriceMad, fixedPriceMad)
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
