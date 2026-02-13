import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

/**
 * BookingExpirationService
 *
 * Cron toutes les heures : passe les bookings PENDING et WAITING_FOR_CLIENT
 * en EXPIRED quand expiresAt < now().
 * Persiste un BookingEvent pour chaque booking expiré via createMany.
 */
@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireBookings() {
    const now = new Date();

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'WAITING_FOR_CLIENT'] },
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (expiredBookings.length === 0) return;

    const ids = expiredBookings.map((b) => b.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: { id: { in: ids } },
        data: { status: 'EXPIRED' },
      });

      await tx.bookingEvent.createMany({
        data: ids.map((id) => ({
          bookingId: id,
          type: 'EXPIRED' as const,
          actorUserId: null,
          actorRole: null,
          metadata: { reason: 'AUTO_EXPIRE' },
        })),
      });
    });

    this.logger.log(`Expired ${ids.length} booking(s) with events persisted`);
  }
}
