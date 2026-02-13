import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(clientId: string, proId: string) {
    // Verify pro exists, is active, and KYC approved
    const pro = await this.prisma.user.findFirst({
      where: {
        id: proId,
        role: 'PRO',
        status: 'ACTIVE',
        proProfile: { kycStatus: 'APPROVED' },
      },
    });

    if (!pro) {
      throw new NotFoundException('Pro introuvable');
    }

    // Upsert (idempotent)
    await this.prisma.favorite.upsert({
      where: { clientId_proId: { clientId, proId } },
      create: { clientId, proId },
      update: {},
    });

    return { success: true };
  }

  async removeFavorite(clientId: string, proId: string) {
    // Idempotent — delete if exists
    await this.prisma.favorite.deleteMany({
      where: { clientId, proId },
    });

    return { success: true };
  }

  async getFavorites(clientId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        pro: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            proProfile: {
              select: {
                kycStatus: true,
                isPremium: true,
                city: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Filter out non-approved pros and map to clean format
    const result = [];
    for (const fav of favorites) {
      if (!fav.pro.proProfile || fav.pro.proProfile.kycStatus !== 'APPROVED') continue;

      const reviewAgg = await this.prisma.review.aggregate({
        where: { proId: fav.proId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      result.push({
        proId: fav.pro.id,
        firstName: fav.pro.firstName,
        lastName: fav.pro.lastName ? `${fav.pro.lastName.charAt(0)}.` : '',
        avatarUrl: fav.pro.avatarUrl,
        city: fav.pro.proProfile.city?.name || 'Maroc',
        isPremium: fav.pro.proProfile.isPremium,
        ratingAvg: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
        ratingCount: reviewAgg._count.rating,
        createdAt: fav.createdAt,
      });
    }

    return result;
  }
}
