import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

/**
 * SubscriptionExpirationService
 *
 * Cron toutes les heures :
 * - Retire isPremium sur les ProProfiles dont premiumActiveUntil est dépassé.
 * - Nullifie boostActiveUntil quand dépassé (impacte le tri du listing public).
 */
@Injectable()
export class SubscriptionExpirationService {
  private readonly logger = new Logger(SubscriptionExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions() {
    const now = new Date();

    // 0.3.a — Expiration Premium
    const premiumResult = await this.prisma.proProfile.updateMany({
      where: {
        isPremium: true,
        premiumActiveUntil: { not: null, lt: now },
      },
      data: {
        isPremium: false,
        premiumActiveUntil: null,
      },
    });

    if (premiumResult.count > 0) {
      this.logger.log(`Expired ${premiumResult.count} Premium subscription(s)`);
    }

    // 0.3.b — Expiration Boost
    const boostResult = await this.prisma.proProfile.updateMany({
      where: {
        boostActiveUntil: { not: null, lt: now },
      },
      data: {
        boostActiveUntil: null,
      },
    });

    if (boostResult.count > 0) {
      this.logger.log(`Expired ${boostResult.count} Boost(s)`);
    }
  }
}
