import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * DashboardStatsResponse
 * Statistiques pour le tableau de bord PRO Premium
 */
export interface DashboardStatsResponse {
  requestsCount: Array<{ date: string; count: number }>;
  conversionRate: { confirmed: number; declined: number };
  pendingCount: number;
  nextBooking: {
    client: { firstName: string; lastName: string };
    timeSlot: string;
    category: { name: string };
  } | null;
}

/**
 * DashboardService
 * Service pour les statistiques du tableau de bord PRO
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * getStats
   * Retourne les statistiques pour le tableau de bord PRO Premium
   *
   * @param userId - ID du PRO connecté
   * @param userRole - Rôle de l'utilisateur (doit être PRO)
   * @returns Statistiques du dashboard
   */
  async getStats(userId: string, userRole: string): Promise<DashboardStatsResponse> {
    // 1. VALIDATION ROLE
    if (userRole !== 'PRO') {
      throw new ForbiddenException({
        message: 'Accès réservé aux professionnels',
        code: 'PRO_ONLY',
      });
    }

    // 2. PREMIUM ONLY
    const pro = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        proProfile: {
          select: {
            isPremium: true,
          },
        },
      },
    });

    if (!pro || pro.role !== 'PRO') {
      throw new ForbiddenException({
        message: 'Accès réservé aux professionnels',
        code: 'PRO_ONLY',
      });
    }

    if (!pro.proProfile?.isPremium) {
      throw new ForbiddenException({
        message: 'Un abonnement Premium est requis pour accéder aux statistiques.',
        code: 'PREMIUM_REQUIRED',
      });
    }

    // 3. REQUESTS COUNT (7 derniers jours)
    // Récupère les bookings des 7 derniers jours, groupés par date
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 jours incluant aujourd'hui
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const bookingsLast7Days = await this.prisma.booking.findMany({
      where: {
        proId: userId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    // Grouper par date
    const countsByDate = new Map<string, number>();

    // Initialiser les 7 derniers jours avec 0
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      countsByDate.set(dateStr, 0);
    }

    // Compter les bookings par date
    bookingsLast7Days.forEach((booking) => {
      const dateStr = booking.createdAt.toISOString().split('T')[0];
      if (countsByDate.has(dateStr)) {
        countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
      }
    });

    const requestsCount = Array.from(countsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. CONVERSION RATE
    // Compte les bookings CONFIRMED et DECLINED (tous les temps)
    const [confirmedCount, declinedCount] = await Promise.all([
      this.prisma.booking.count({
        where: { proId: userId, status: 'CONFIRMED' },
      }),
      this.prisma.booking.count({
        where: { proId: userId, status: 'DECLINED' },
      }),
    ]);

    const conversionRate = {
      confirmed: confirmedCount,
      declined: declinedCount,
    };

    // 5. PENDING COUNT
    const pendingCount = await this.prisma.booking.count({
      where: { proId: userId, status: 'PENDING' },
    });

    // 6. NEXT BOOKING
    // Prochaine réservation CONFIRMED à venir (timeSlot >= maintenant)
    const now = new Date();
    const nextBooking = await this.prisma.booking.findFirst({
      where: {
        proId: userId,
        status: 'CONFIRMED',
        timeSlot: { gte: now },
      },
      orderBy: { timeSlot: 'asc' },
      select: {
        timeSlot: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      requestsCount,
      conversionRate,
      pendingCount,
      nextBooking: nextBooking
        ? {
            client: nextBooking.client,
            timeSlot: nextBooking.timeSlot.toISOString(),
            category: nextBooking.category,
          }
        : null,
    };
  }
}
