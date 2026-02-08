import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../database/prisma.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

const CACHE_TTL_CITIES = 10 * 60 * 1000;      // 10 min
const CACHE_TTL_CATEGORIES = 10 * 60 * 1000;   // 10 min
const CACHE_TTL_PROS_V2 = 2 * 60 * 1000;       // 2 min

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.slice(0, 2) + '******' + phone.slice(-2);
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getCities(): Promise<PublicCity[]> {
    const cacheKey = 'catalog:cities';
    const cached = await this.cache.get<PublicCity[]>(cacheKey);
    if (cached) return cached;

    const cities = await this.prisma.city.findMany({ orderBy: { name: 'asc' } });
    await this.cache.set(cacheKey, cities, CACHE_TTL_CITIES);
    return cities;
  }

  async getCategories(): Promise<PublicCategory[]> {
    const cacheKey = 'catalog:categories';
    const cached = await this.cache.get<PublicCategory[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    await this.cache.set(cacheKey, categories, CACHE_TTL_CATEGORIES);
    return categories;
  }

  // Legacy endpoint — kept for backward compatibility
  async getPros(filters: { cityId?: string; categoryId?: string }, page: number = 1, limit: number = 20): Promise<PublicProCard[]> {
    const { cityId, categoryId } = filters;
    this.logger.log(`Recherche Pro: city=${cityId || 'all'}, cat=${categoryId || 'all'}`);

    const whereClause = this.buildProWhereClause(cityId, categoryId);

    try {
      const skip = (page - 1) * limit;
      const pros = await this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: this.proSelectFields(),
      });

      this.logger.log(`${pros.length} pros found`);
      return pros.map((pro) => this.mapToPublicProCard(pro));
    } catch (error) {
      this.logger.error(`Prisma error in getPros: ${error.message}`);
      throw error;
    }
  }

  // V2 endpoint — select partial + total + tri monétisation + cache
  async getProsV2(
    filters: { cityId?: string; categoryId?: string },
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: PublicProCard[]; total: number; page: number; limit: number }> {
    const { cityId, categoryId } = filters;

    const cacheKey = `catalog:pros:v2:${cityId || '_'}:${categoryId || '_'}:${page}:${limit}`;
    const cached = await this.cache.get<{ data: PublicProCard[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) return cached;

    this.logger.log(`Recherche Pro v2: city=${cityId || 'all'}, cat=${categoryId || 'all'}, page=${page}`);

    const whereClause = this.buildProWhereClause(cityId, categoryId);
    const skip = (page - 1) * limit;

    const [pros, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: this.proSelectFields(),
        orderBy: [
          { proProfile: { isPremium: 'desc' } },
          { proProfile: { boostActiveUntil: 'desc' } },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    this.logger.log(`${pros.length}/${total} pros found (page ${page})`);

    const result = {
      data: pros.map((pro) => this.mapToPublicProCard(pro)),
      total,
      page,
      limit,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_PROS_V2);
    return result;
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
          select: {
            isPremium: true,
            kycStatus: true,
            boostActiveUntil: true,
            city: { select: { id: true, name: true } },
            services: {
              select: {
                categoryId: true,
                pricingType: true,
                minPriceMad: true,
                maxPriceMad: true,
                fixedPriceMad: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!pro || !pro.proProfile) {
      throw new NotFoundException('Pro introuvable');
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

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private buildProWhereClause(cityId?: string, categoryId?: string) {
    const profileConditions: any = {};

    if (cityId) {
      profileConditions.cityId = cityId;
    }
    if (categoryId) {
      profileConditions.services = {
        some: { categoryId },
      };
    }

    const whereClause: any = {
      role: 'PRO',
      status: 'ACTIVE',
    };

    if (Object.keys(profileConditions).length > 0) {
      whereClause.proProfile = { is: profileConditions };
    } else {
      whereClause.proProfile = { isNot: null };
    }

    return whereClause;
  }

  /** Select partiel — JAMAIS de password ni de données sensibles */
  private proSelectFields() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      proProfile: {
        select: {
          isPremium: true,
          kycStatus: true,
          boostActiveUntil: true,
          city: { select: { id: true, name: true } },
          services: {
            select: {
              categoryId: true,
              pricingType: true,
              minPriceMad: true,
              maxPriceMad: true,
              fixedPriceMad: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    } as const;
  }

  private mapToPublicProCard(user: any): PublicProCard {
    const profile = user.proProfile;
    const lastNameInitial = user.lastName ? `${user.lastName.charAt(0)}.` : '';

    const servicesFormatted = profile.services.map((s: any) => {
      let priceText = 'Prix sur devis';

      if (s.pricingType === 'FIXED' && s.fixedPriceMad) {
        priceText = `${s.fixedPriceMad} MAD`;
      } else if (s.pricingType === 'RANGE') {
        if (s.minPriceMad && s.maxPriceMad) {
          priceText = `De ${s.minPriceMad} à ${s.maxPriceMad} MAD`;
        } else if (s.minPriceMad) {
          priceText = `À partir de ${s.minPriceMad} MAD`;
        }
      }

      return {
        name: s.category?.name || 'Service',
        priceFormatted: priceText,
        categoryId: s.categoryId,
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
