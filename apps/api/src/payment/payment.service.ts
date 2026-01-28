import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BoostStatus,
} from './types/prisma-enums';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import {
  PAYMENT_PLANS,
  PAYMENT_STATUS,
  BOOST_COOLDOWN_DAYS,
  BOOST_ACTIVE_DAYS,
  PlanType,
} from './utils/payment.constants';

/**
 * PaymentService - Version MANUAL (MVP)
 *
 * Gère les paiements manuels pour Premium et Boost.
 * Le paiement réel se fait hors plateforme (virement, cash, etc.)
 * Un admin validera manuellement le paiement.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crée une demande de paiement (PENDING).
   * Retourne une référence que le client utilisera pour le règlement manuel.
   */
  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    // 1. Récupération Profil & User
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!proProfile) {
      throw new NotFoundException('Profil PRO non trouvé');
    }

    // 2. Logique Métier (Boost, Premium, Cooldown...)
    const now = new Date();
    const plan = PAYMENT_PLANS[dto.planType];

    if (!plan) {
      throw new BadRequestException(`Plan invalide: ${dto.planType}`);
    }

    if (dto.planType === 'BOOST') {
      if (!dto.cityId || !dto.categoryId) {
        throw new BadRequestException('cityId et categoryId requis pour BOOST');
      }
      if (proProfile.isPremium && proProfile.premiumActiveUntil && proProfile.premiumActiveUntil > now) {
        throw new BadRequestException('Exclusivité: Premium déjà actif, Boost non disponible');
      }

      // Check Cooldown Boost
      const lastBoost = await this.prisma.proBoost.findFirst({
        where: { proUserId: userId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastBoost) {
        const daysSinceLastBoost = Math.floor(
          (now.getTime() - lastBoost.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastBoost < BOOST_COOLDOWN_DAYS) {
          throw new BadRequestException(
            `Cooldown Boost: Attendez ${BOOST_COOLDOWN_DAYS - daysSinceLastBoost} jours.`
          );
        }
      }
    } else {
      // Premium: Vérifier qu'un boost n'est pas actif
      if (proProfile.boostActiveUntil && proProfile.boostActiveUntil > now) {
        throw new BadRequestException('Exclusivité: Boost déjà actif');
      }
    }

    // 3. Génération de la référence unique
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const oid = `KHD-${timestamp}-${random}`;
    const amountCents = Math.round(plan.priceMad * 100);

    // 4. Enregistrement de la demande (PENDING)
    const order = await this.prisma.paymentOrder.create({
      data: {
        oid,
        proUserId: userId,
        planType: dto.planType,
        amountCents,
        status: PAYMENT_STATUS.PENDING,
        provider: 'MANUAL',
        cityId: dto.cityId || null,
        categoryId: dto.categoryId || null,
      },
    });

    this.logger.log(`📝 Demande de paiement créée: ${oid} | ${dto.planType} | ${plan.priceMad} MAD`);

    // 5. Retour au Frontend
    return {
      success: true,
      order: {
        id: order.id,
        reference: order.oid,
        planType: order.planType,
        amount: plan.priceMad,
        currency: 'MAD',
        status: order.status,
      },
      message: `Demande enregistrée. Référence: ${order.oid}. Contactez-nous pour le règlement.`,
      paymentInstructions: {
        reference: order.oid,
        amount: `${plan.priceMad} MAD`,
        methods: [
          'Virement bancaire',
          'Cash en agence',
          'Mobile Money (Orange Money, inwi money)',
        ],
        contact: {
          phone: '+212 6XX XXX XXX',
          email: 'paiement@khadamat.ma',
        },
        note: 'Mentionnez votre référence lors du paiement.',
      },
    };
  }

  /**
   * [ADMIN] Valide manuellement un paiement et active le plan.
   * Appelé par un admin après vérification du paiement reçu.
   */
  async confirmPayment(oid: string, adminNotes?: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { oid },
    });

    if (!order) {
      throw new NotFoundException(`Commande non trouvée: ${oid}`);
    }

    if (order.status === PAYMENT_STATUS.PAID) {
      throw new BadRequestException('Ce paiement a déjà été validé');
    }

    // Mise à jour du statut
    const updatedOrder = await this.prisma.paymentOrder.update({
      where: { oid },
      data: {
        status: PAYMENT_STATUS.PAID,
        paidAt: new Date(),
        adminNotes: adminNotes || 'Validé manuellement',
      },
    });

    // Activer le plan
    await this.activatePlan(updatedOrder);

    this.logger.log(`✅ Paiement validé manuellement: ${oid}`);

    return {
      success: true,
      message: `Paiement ${oid} validé et plan activé.`,
    };
  }

  /**
   * [ADMIN] Rejette un paiement.
   */
  async rejectPayment(oid: string, reason: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { oid },
    });

    if (!order) {
      throw new NotFoundException(`Commande non trouvée: ${oid}`);
    }

    if (order.status !== PAYMENT_STATUS.PENDING) {
      throw new BadRequestException('Seuls les paiements en attente peuvent être rejetés');
    }

    await this.prisma.paymentOrder.update({
      where: { oid },
      data: {
        status: PAYMENT_STATUS.FAILED,
        adminNotes: reason || 'Rejeté par admin',
      },
    });

    this.logger.log(`❌ Paiement rejeté: ${oid} - ${reason}`);

    return {
      success: true,
      message: `Paiement ${oid} rejeté.`,
    };
  }

  /**
   * Liste les paiements en attente (pour admin).
   */
  async getPendingPayments() {
    return this.prisma.paymentOrder.findMany({
      where: { status: PAYMENT_STATUS.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupère le statut d'un paiement.
   */
  async getPaymentStatus(oid: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { oid },
    });

    if (!order) {
      throw new NotFoundException(`Commande non trouvée: ${oid}`);
    }

    const plan = PAYMENT_PLANS[order.planType as PlanType];

    return {
      reference: order.oid,
      planType: order.planType,
      amount: order.amountCents / 100,
      currency: 'MAD',
      status: order.status,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    };
  }

  /**
   * Active le plan (Premium ou Boost) après paiement validé.
   * Utilise une transaction DB atomique.
   */
  private async activatePlan(order: any) {
    const now = new Date();
    const plan = PAYMENT_PLANS[order.planType as PlanType];

    await this.prisma.$transaction(async (tx) => {
      // Logique BOOST
      if (order.planType === 'BOOST') {
        const startsAt = now;
        const endsAt = new Date(now.getTime() + BOOST_ACTIVE_DAYS * 24 * 60 * 60 * 1000);

        await tx.proBoost.create({
          data: {
            pro: { connect: { userId: order.proUserId } },
            city: { connect: { id: order.cityId! } },
            category: { connect: { id: order.categoryId! } },
            status: BoostStatus.ACTIVE,
            startsAt,
            endsAt,
            priceMad: Math.round(plan.priceMad),
          },
        });

        await tx.proProfile.update({
          where: { userId: order.proUserId },
          data: { boostActiveUntil: endsAt },
        });
      }
      // Logique PREMIUM
      else {
        const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

        const existingSubscription = await tx.proSubscription.findFirst({
          where: { proUserId: order.proUserId, status: SubscriptionStatus.ACTIVE },
        });

        const subscriptionPlan =
          order.planType === 'PREMIUM_MONTHLY'
            ? SubscriptionPlan.PREMIUM_MONTHLY_NO_COMMIT
            : SubscriptionPlan.PREMIUM_ANNUAL_COMMIT;

        const subscriptionData = {
          plan: subscriptionPlan,
          status: SubscriptionStatus.ACTIVE,
          priceMad: Math.round(plan.priceMad),
          startedAt: now,
          commitmentStartsAt: order.planType === 'PREMIUM_ANNUAL' ? now : undefined,
          commitmentEndsAt: order.planType === 'PREMIUM_ANNUAL' ? endsAt : undefined,
          endDate: endsAt,
        };

        if (existingSubscription) {
          await tx.proSubscription.update({
            where: { id: existingSubscription.id },
            data: subscriptionData,
          });
        } else {
          await tx.proSubscription.create({
            data: {
              pro: { connect: { userId: order.proUserId } },
              transactionId: order.oid,
              ...subscriptionData,
            },
          });
        }

        await tx.proProfile.update({
          where: { userId: order.proUserId },
          data: { isPremium: true, premiumActiveUntil: endsAt },
        });
      }
    });

    this.logger.log(`🚀 Plan activé: ${order.planType} pour User ${order.proUserId}`);
  }
}
