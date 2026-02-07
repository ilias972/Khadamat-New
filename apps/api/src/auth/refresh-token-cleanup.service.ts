import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

/**
 * RefreshTokenCleanupService
 *
 * Purge automatique des refresh tokens expirés ou révoqués depuis plus de 30 jours.
 * Exécuté tous les jours à 3h du matin.
 */
@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredTokens() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          // Tokens expirés depuis plus de 30 jours
          { expiresAt: { lt: thirtyDaysAgo } },
          // Tokens révoqués depuis plus de 30 jours
          { revoked: true, createdAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} expired/revoked refresh tokens`);
    }
  }
}
