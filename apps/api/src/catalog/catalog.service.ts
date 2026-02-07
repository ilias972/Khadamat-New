import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.slice(0, 2) + '******' + phone.slice(-2);
}

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

  async getPros(filters: { cityId?: string; categoryId?: string }, page: number = 1, limit: number = 20): Promise<PublicProCard[]> {
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
      const skip = (page - 1) * limit;
      const pros = await this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
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

  async getProDetail(id: string, currentUserId?: string): Promise<PublicProProfile> {
    const pro = await this.prisma.user.findUnique({
      where: { id, role: 'PRO', status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
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

    const result = this.mapToPublicProCard(pro) as PublicProProfile;

    // Démasquer le phone si owner ou client avec booking confirmé
    if (currentUserId) {
      const isOwner = currentUserId === pro.id;

      const hasConfirmedBooking = !isOwner && await this.prisma.booking.count({
        where: {
          proId: pro.id,
          clientId: currentUserId,
          status: 'CONFIRMED',
        },
      }) > 0;

      if (isOwner || hasConfirmedBooking) {
        result.phone = pro.phone;
      }
    }

    return result;
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
      phone: maskPhone(user.phone),
      city: profile.city?.name || 'Maroc',
      isVerified: profile.kycStatus === 'APPROVED',
      services: servicesFormatted,
    };
  }
}
