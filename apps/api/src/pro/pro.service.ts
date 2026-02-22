import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CatalogResolverService } from '../catalog/catalog-resolver.service';
import { validateUrl } from '../common/utils/url-validation';
import type {
  UpdateProProfileInput,
  UpdateServicesInput,
  UpdateAvailabilityInput,
} from '@khadamat/contracts';

const FREE_BIO_MAX = 100;
const PREMIUM_BIO_MAX = 500;
const FREE_SERVICES_MAX = 1;
const PREMIUM_SERVICES_MAX = 3;
const PORTFOLIO_MAX = 6;

@Injectable()
export class ProService {
  constructor(
    private prisma: PrismaService,
    private catalogResolver: CatalogResolverService,
  ) {}

  /**
   * Source de vérité Premium : ProProfile.isPremium + premiumActiveUntil
   */
  async isPremiumPro(userId: string): Promise<boolean> {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { isPremium: true, premiumActiveUntil: true },
    });
    if (!profile) return false;
    if (!profile.isPremium) return false;
    if (profile.premiumActiveUntil && profile.premiumActiveUntil < new Date()) return false;
    return true;
  }

  async getMyDashboard(userId: string) {
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            publicId: true,
            role: true,
            status: true,
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            cityId: true,
            addressLine: true,
            avatarUrl: true,
            city: {
              select: {
                id: true,
                publicId: true,
                name: true,
              },
            },
            createdAt: true,
          },
        },
        city: {
          select: {
            id: true,
            publicId: true,
            name: true,
            slug: true,
          },
        },
        services: {
          include: {
            category: {
              select: {
                id: true,
                publicId: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        weeklyAvailability: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
        portfolio: {
          orderBy: { createdAt: 'desc' },
          take: PORTFOLIO_MAX,
        },
      },
    });

    if (!proProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // Rating aggregates
    const reviewAgg = await this.prisma.review.aggregate({
      where: { proId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Last 5 reviews
    const lastReviews = await this.prisma.review.findMany({
      where: { proId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    const userCityId = proProfile.user.city?.publicId ?? proProfile.user.cityId;
    const profileCityId = proProfile.city?.publicId ?? proProfile.cityId;

    return {
      user: {
        ...proProfile.user,
        id: proProfile.user.publicId ?? proProfile.user.id,
        cityId: userCityId,
        city: proProfile.user.city
          ? { id: proProfile.user.city.publicId ?? proProfile.user.city.id, name: proProfile.user.city.name }
          : null,
      },
      profile: {
        userId: proProfile.userId,
        publicId: proProfile.publicId,
        cityId: profileCityId,
        city: proProfile.city
          ? { id: proProfile.city.publicId ?? proProfile.city.id, name: proProfile.city.name, slug: proProfile.city.slug }
          : null,
        whatsapp: proProfile.whatsapp,
        bio: proProfile.bio,
        kycStatus: proProfile.kycStatus,
        isPremium: proProfile.isPremium,
        premiumActiveUntil: proProfile.premiumActiveUntil,
        boostActiveUntil: proProfile.boostActiveUntil,
        createdAt: proProfile.createdAt,
        updatedAt: proProfile.updatedAt,
        ratingAvg: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
        ratingCount: reviewAgg._count.rating,
        lastReviews,
      },
      services: proProfile.services.map((service) => ({
        ...service,
        categoryId: service.category?.publicId ?? service.categoryId,
        category: service.category
          ? { id: service.category.publicId ?? service.category.id, name: service.category.name, slug: service.category.slug }
          : service.category,
      })),
      availability: proProfile.weeklyAvailability,
      portfolio: proProfile.portfolio,
    };
  }

  async updateProfile(userId: string, dto: UpdateProProfileInput & { bio?: string; avatarUrl?: string }) {
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // Bio validation
    if (dto.bio !== undefined) {
      const isPremium = await this.isPremiumPro(userId);
      const maxLen = isPremium ? PREMIUM_BIO_MAX : FREE_BIO_MAX;
      if (dto.bio.length > maxLen) {
        throw new BadRequestException('BIO_TOO_LONG');
      }
    }

    let resolvedCityId: string | undefined;
    if (dto.cityId) {
      resolvedCityId = await this.catalogResolver.resolveCityId(dto.cityId);
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: dto.phone,
          id: { not: userId },
        },
      });
      if (existingPhone) {
        throw new BadRequestException('Données invalides');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const userUpdateData: { cityId?: string; phone?: string; avatarUrl?: string } = {};
      if (resolvedCityId) userUpdateData.cityId = resolvedCityId;
      if (dto.phone) userUpdateData.phone = dto.phone;
      if (dto.avatarUrl !== undefined) userUpdateData.avatarUrl = validateUrl(dto.avatarUrl);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: userUpdateData,
        select: {
          id: true,
          role: true,
          status: true,
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          cityId: true,
          addressLine: true,
          avatarUrl: true,
          city: {
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          },
        },
      });

      const profileUpdateData: { cityId?: string; whatsapp?: string; bio?: string } = {};
      if (resolvedCityId) profileUpdateData.cityId = resolvedCityId;
      if (dto.whatsapp) profileUpdateData.whatsapp = dto.whatsapp;
      if (dto.bio !== undefined) profileUpdateData.bio = dto.bio;

      const updatedProfile = await tx.proProfile.update({
        where: { userId },
        data: profileUpdateData,
        include: {
          city: {
            select: {
              id: true,
              publicId: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return { user: updatedUser, profile: updatedProfile };
    });

    return {
      user: {
        ...result.user,
        cityId: result.user.city?.publicId ?? result.user.cityId,
        city: result.user.city
          ? { id: result.user.city.publicId ?? result.user.city.id, name: result.user.city.name }
          : null,
      },
      profile: {
        ...result.profile,
        cityId: result.profile.city?.publicId ?? result.profile.cityId,
        city: result.profile.city
          ? { id: result.profile.city.publicId ?? result.profile.city.id, name: result.profile.city.name, slug: result.profile.city.slug }
          : null,
      },
    };
  }

  async updateServices(userId: string, dto: UpdateServicesInput) {
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    const categoryPublicIds = [...new Set(dto.map((s) => s.categoryId))];
    const activeCount = dto.filter((s) => s.isActive).length;

    // Limite services actifs Free/Premium
    const isPremium = await this.isPremiumPro(userId);
    const maxServices = isPremium ? PREMIUM_SERVICES_MAX : FREE_SERVICES_MAX;
    if (activeCount > maxServices) {
      throw new BadRequestException('SERVICE_LIMIT_REACHED');
    }

    const categories = await this.prisma.category.findMany({
      where: { publicId: { in: categoryPublicIds } },
      select: { id: true, publicId: true },
    });

    if (categories.length !== categoryPublicIds.length) {
      throw new NotFoundException('Une ou plusieurs catégories sont invalides');
    }
    const categoryIdMap = new Map(categories.map((c) => [c.publicId, c.id]));

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.proService.deleteMany({
        where: { proUserId: userId },
      });

      if (dto.length > 0) {
        await tx.proService.createMany({
          data: dto.map((service) => ({
            proUserId: userId,
            categoryId: categoryIdMap.get(service.categoryId)!,
            pricingType: service.pricingType,
            fixedPriceMad: service.fixedPriceMad ?? null,
            minPriceMad: service.minPriceMad ?? null,
            maxPriceMad: service.maxPriceMad ?? null,
            isActive: service.isActive,
          })),
        });
      }

      const updatedServices = await tx.proService.findMany({
        where: { proUserId: userId },
        include: {
          category: {
            select: {
              id: true,
              publicId: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return updatedServices.map((service) => ({
        ...service,
        categoryId: service.category?.publicId ?? service.categoryId,
        category: service.category
          ? { id: service.category.publicId ?? service.category.id, name: service.category.name, slug: service.category.slug }
          : service.category,
      }));
    });

    return result;
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityInput) {
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // DA-07: Guard défensif contre doublons dayOfWeek (defense-in-depth)
    const dayOfWeekSet = new Set<number>();
    for (const slot of dto) {
      if (dayOfWeekSet.has(slot.dayOfWeek)) {
        throw new BadRequestException(`Duplicate dayOfWeek: ${slot.dayOfWeek}`);
      }
      dayOfWeekSet.add(slot.dayOfWeek);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({
        where: { proUserId: userId },
      });

      if (dto.length > 0) {
        await tx.weeklyAvailability.createMany({
          data: dto.map((slot) => ({
            proUserId: userId,
            dayOfWeek: slot.dayOfWeek,
            startMin: slot.startMin,
            endMin: slot.endMin,
            isActive: slot.isActive,
          })),
        });
      }

      const newAvailability = await tx.weeklyAvailability.findMany({
        where: { proUserId: userId },
        orderBy: {
          dayOfWeek: 'asc',
        },
      });

      return newAvailability;
    });

    return result;
  }

  // ── Portfolio ──

  async getPortfolio(userId: string) {
    return this.prisma.proPortfolioImage.findMany({
      where: { proUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: PORTFOLIO_MAX,
    });
  }

  async addPortfolioImage(userId: string, url: string) {
    const isPremium = await this.isPremiumPro(userId);
    if (!isPremium) {
      throw new ForbiddenException('PREMIUM_REQUIRED');
    }

    const count = await this.prisma.proPortfolioImage.count({
      where: { proUserId: userId },
    });
    if (count >= PORTFOLIO_MAX) {
      throw new BadRequestException('PORTFOLIO_LIMIT_REACHED');
    }

    return this.prisma.proPortfolioImage.create({
      data: { proUserId: userId, url },
    });
  }

  async deletePortfolioImage(userId: string, imageId: string) {
    const image = await this.prisma.proPortfolioImage.findFirst({
      where: { id: imageId, proUserId: userId },
    });
    if (!image) {
      throw new NotFoundException('Image introuvable');
    }

    await this.prisma.proPortfolioImage.delete({ where: { id: imageId } });
    return { success: true };
  }
}
