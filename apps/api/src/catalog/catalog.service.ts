import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../database/prisma.service';
import { CatalogResolverService } from './catalog-resolver.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
} from '@khadamat/contracts';

const CACHE_TTL_CITIES = 10 * 60 * 1000;      // 10 min
const CACHE_TTL_CATEGORIES = 10 * 60 * 1000;   // 10 min
const CACHE_TTL_PROS_V2 = 2 * 60 * 1000;       // 2 min

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private catalogResolver: CatalogResolverService,
  ) {}

  async getCities(): Promise<PublicCity[]> {
    const cacheKey = 'catalog:cities';
    const cached = await this.cache.get<PublicCity[]>(cacheKey);
    if (cached) return cached;

    const cities = await this.prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { publicId: true, name: true, slug: true },
    });
    const result = cities.map((city) => ({
      id: city.publicId,
      name: city.name,
      slug: city.slug,
    }));
    await this.cache.set(cacheKey, result, CACHE_TTL_CITIES);
    return result;
  }

  async getCategories(): Promise<PublicCategory[]> {
    const cacheKey = 'catalog:categories';
    const cached = await this.cache.get<PublicCategory[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { publicId: true, name: true, slug: true },
    });
    const result = categories.map((category) => ({
      id: category.publicId,
      name: category.name,
      slug: category.slug,
    }));
    await this.cache.set(cacheKey, result, CACHE_TTL_CATEGORIES);
    return result;
  }

  // Legacy endpoint — kept for backward compatibility
  async getPros(filters: { cityId?: string; categoryId?: string }, page: number = 1, limit: number = 20): Promise<PublicProCard[]> {
    const { cityId: cityPublicId, categoryId: categoryPublicId } = filters;
    this.logger.log(`Recherche Pro: city=${cityPublicId || 'all'}, cat=${categoryPublicId || 'all'}`);

    const cityId = cityPublicId ? await this.catalogResolver.resolveCityId(cityPublicId) : undefined;
    const categoryId = categoryPublicId ? await this.catalogResolver.resolveCategoryId(categoryPublicId) : undefined;
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
    const { cityId: cityPublicId, categoryId: categoryPublicId } = filters;

    const cacheKey = `catalog:pros:v2:${cityPublicId || '_'}:${categoryPublicId || '_'}:${page}:${limit}`;
    const cached = await this.cache.get<{ data: PublicProCard[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) return cached;

    this.logger.log(`Recherche Pro v2: city=${cityPublicId || 'all'}, cat=${categoryPublicId || 'all'}, page=${page}`);

    const cityId = cityPublicId ? await this.catalogResolver.resolveCityId(cityPublicId) : undefined;
    const categoryId = categoryPublicId ? await this.catalogResolver.resolveCategoryId(categoryPublicId) : undefined;
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

  /**
   * getProDetail — lookup by ProProfile.publicId
   */
  async getProDetail(publicId: string, currentUserId?: string): Promise<any> {
    // Try lookup by ProProfile.publicId first
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { publicId },
      select: { userId: true },
    });

    // Fallback: if publicId looks like a cuid, try legacy lookup by User.id
    const userId = proProfile?.userId;
    if (!userId) {
      throw new NotFoundException('Pro introuvable');
    }

    const pro = await this.prisma.user.findUnique({
      where: { id: userId, role: 'PRO', status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        proProfile: {
          select: {
            publicId: true,
            isPremium: true,
            kycStatus: true,
            bio: true,
            boostActiveUntil: true,
            premiumActiveUntil: true,
            city: { select: { publicId: true, name: true } },
            services: {
              select: {
                categoryId: true,
                pricingType: true,
                minPriceMad: true,
                maxPriceMad: true,
                fixedPriceMad: true,
                category: { select: { id: true, name: true, publicId: true } },
              },
            },
            portfolio: {
              orderBy: { createdAt: 'desc' as const },
              take: 6,
              select: { id: true, url: true },
            },
          },
        },
      },
    });

    if (!pro || !pro.proProfile || pro.proProfile.kycStatus !== 'APPROVED') {
      throw new NotFoundException('Pro introuvable');
    }

    // Rating aggregates via Prisma aggregate
    const [reviewAgg, completedCount, lastReviews] = await Promise.all([
      this.prisma.review.aggregate({
        where: { proId: pro.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.booking.count({
        where: { proId: pro.id, status: 'COMPLETED' },
      }),
      this.prisma.review.findMany({
        where: { proId: pro.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          rating: true,
          comment: true,
          createdAt: true,
        },
      }),
    ]);

    const result = this.mapToPublicProCard(pro) as any;
    // Override id with ProProfile.publicId
    result.id = pro.proProfile.publicId;
    result.avatarUrl = pro.avatarUrl || null;
    result.bio = pro.proProfile.bio || null;
    result.isPremium = pro.proProfile.isPremium;
    result.ratingAvg = reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null;
    result.ratingCount = reviewAgg._count.rating;
    result.completedBookingsCount = completedCount;
    result.lastReviews = lastReviews;

    // Portfolio only for premium pros
    const isPremiumActive = pro.proProfile.isPremium &&
      (!pro.proProfile.premiumActiveUntil || pro.proProfile.premiumActiveUntil > new Date());
    result.portfolio = isPremiumActive
      ? (pro.proProfile.portfolio || []).map((p: any) => ({ url: p.url }))
      : [];

    // Démasquer le phone si owner ou client avec booking confirmé
    if (currentUserId) {
      const isOwner = currentUserId === pro.id;
      const hasEligibleBooking = !isOwner && await this.prisma.booking.count({
        where: {
          proId: pro.id,
          clientId: currentUserId,
          status: { in: ['PENDING', 'CONFIRMED', 'WAITING_FOR_CLIENT', 'COMPLETED'] },
        },
      }) > 0;

      if (isOwner || hasEligibleBooking) {
        result.phone = pro.phone || undefined;
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private buildProWhereClause(cityId?: string, categoryId?: string) {
    const profileConditions: any = {
      kycStatus: 'APPROVED',
    };

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
      proProfile: { is: profileConditions },
    };

    return whereClause;
  }

  /** Select partiel — JAMAIS de password ni de données sensibles */
  private proSelectFields() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      proProfile: {
        select: {
          publicId: true,
          isPremium: true,
          kycStatus: true,
          boostActiveUntil: true,
          city: { select: { publicId: true, name: true } },
          services: {
            select: {
              categoryId: true,
              pricingType: true,
              minPriceMad: true,
              maxPriceMad: true,
              fixedPriceMad: true,
              category: { select: { id: true, name: true, publicId: true } },
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

      const categoryPublicId = s.category?.publicId;
      if (!categoryPublicId) {
        throw new Error('Category publicId missing');
      }

      return {
        name: s.category?.name || 'Service',
        priceFormatted: priceText,
        categoryId: categoryPublicId,
      };
    });

    return {
      // Use ProProfile.publicId instead of User.id
      id: profile.publicId,
      firstName: user.firstName,
      lastName: lastNameInitial,
      city: profile.city?.name || 'Maroc',
      isVerified: profile.kycStatus === 'APPROVED',
      services: servicesFormatted,
    };
  }

}
