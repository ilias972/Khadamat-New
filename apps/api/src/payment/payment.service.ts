import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionPlan, SubscriptionStatus, BoostStatus } from './types/prisma-enums';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CmiCallbackDto } from './dto/cmi-callback.dto';
import { generateCmiHash, verifyCmiHash } from './utils/cmi-hash';
import {
  PAYMENT_PLANS,
  PAYMENT_STATUS,
  BOOST_COOLDOWN_DAYS,
  BOOST_ACTIVE_DAYS,
  PlanType,
} from './utils/payment.constants';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Initie un paiement CMI.
   *
   * Règles métier :
   * - Premium et Boost sont mutuellement exclusifs
   * - Cooldown Boost : 1 Boost / 21 jours (7j actif + 14j repos)
   * - Les Gratuits ont max 1 service (déjà codé ailleurs)
   */
  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    // 1. Récupérer le profil PRO
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!proProfile) {
      throw new NotFoundException('Profil PRO non trouvé');
    }

    // 2. Vérifications métier
    const now = new Date();
    const plan = PAYMENT_PLANS[dto.planType];

    // Vérif BOOST : cityId et categoryId requis
    if (dto.planType === 'BOOST') {
      if (!dto.cityId || !dto.categoryId) {
        throw new BadRequestException('cityId et categoryId sont requis pour BOOST');
      }

      // Vérif exclusivité : Premium actif ?
      if (proProfile.isPremium && proProfile.premiumActiveUntil && proProfile.premiumActiveUntil > now) {
        throw new BadRequestException(
          'Exclusivité : Vous avez déjà un abonnement Premium actif. ' +
            'Premium et Boost sont mutuellement exclusifs.',
        );
      }

      // Vérif Cooldown : Dernier Boost < 21 jours ?
      const lastBoost = await this.prisma.proBoost.findFirst({
        where: { proUserId: userId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastBoost) {
        const daysSinceLastBoost = Math.floor(
          (now.getTime() - lastBoost.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceLastBoost < BOOST_COOLDOWN_DAYS) {
          throw new BadRequestException(
            `Cooldown Boost : Vous devez attendre ${BOOST_COOLDOWN_DAYS - daysSinceLastBoost} jour(s) avant de pouvoir acheter un nouveau Boost. ` +
              `(1 Boost / ${BOOST_COOLDOWN_DAYS} jours)`,
          );
        }
      }
    }

    // Vérif PREMIUM : Boost actif ?
    if (dto.planType !== 'BOOST') {
      if (proProfile.boostActiveUntil && proProfile.boostActiveUntil > now) {
        throw new BadRequestException(
          'Exclusivité : Vous avez déjà un Boost actif. ' +
            'Premium et Boost sont mutuellement exclusifs.',
        );
      }
    }

    // 3. Génération des constantes IMMUABLES (UNE SEULE FOIS)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const oid = `CMD-${timestamp}-${random}`;
    const formattedAmount = Number(plan.priceMad).toFixed(2);
    const rnd = Math.random().toString(36).substring(2, 15);
    const amountCents = Math.round(plan.priceMad * 100);

    // 4. Création du PaymentOrder
    await this.prisma.paymentOrder.create({
      data: {
        oid,
        proUserId: userId,
        planType: dto.planType,
        amountCents,
        status: PAYMENT_STATUS.PENDING,
        cityId: dto.cityId,
        categoryId: dto.categoryId,
      },
    });

    // 5. Construction de l'objet CMI FINAL (UNE SEULE FOIS, AUCUNE MUTATION APRÈS)
    const publicUrl = this.config.get<string>('PUBLIC_URL');
    const cmiParams = {
      clientid: this.config.get<string>('CMI_CLIENT_ID')!,
      oid,
      amount: formattedAmount,
      okUrl: `${publicUrl}/api/payment/callback`,
      failUrl: `${publicUrl}/api/payment/callback`,
      rnd,
      storetype: this.config.get<string>('CMI_STORE_TYPE')!,
      trantype: this.config.get<string>('CMI_TRAN_TYPE')!,
      currency: this.config.get<string>('CMI_CURRENCY')!,
    };

    // 6. FREEZE pour prévenir toute mutation accidentelle
    if (process.env.NODE_ENV !== 'production') {
      Object.freeze(cmiParams);
    }

    // 7. Log propre AVANT hashage
    console.log('🔒 CMI Params Final:', {
      oid,
      rnd,
      amount: cmiParams.amount,
      clientid: cmiParams.clientid,
    });

    // 8. Génération du Hash UNIQUE (UNE SEULE FOIS)
    const hashOrder = this.config.get<string>('CMI_HASH_ORDER')!;
    const signature = generateCmiHash(
      cmiParams,
      this.config.get<string>('CMI_STORE_KEY')!,
      hashOrder,
      this.config.get<string>('CMI_HASH_ALGO')!,
      this.config.get<string>('CMI_HASH_OUTPUT') as 'base64' | 'hex',
    );

    console.log('🔒 CMI Signature:', signature);

    // 9. Retour STRICT (ZÉRO MUTATION après signature)
    return {
      actionUrl: this.config.get<string>('CMI_BASE_URL'),
      fields: {
        ...cmiParams,
        hash: signature,
        // Champs optionnels
        shopurl: this.config.get<string>('FRONTEND_URL'),
        lang: 'fr',
      },
    };
  }

  /**
   * Traite le callback CMI après paiement.
   *
   * Gère l'idempotence, la sécurité (hash), et active le plan si succès.
   */
  async handleCallback(payload: CmiCallbackDto) {
    const { oid, ProcReturnCode, Response, TransId, HASH } = payload;

    // 1. Idempotence : Chercher le PaymentOrder
    const order = await this.prisma.paymentOrder.findUnique({
      where: { oid },
    });

    if (!order) {
      throw new NotFoundException(`Commande ${oid} non trouvée`);
    }

    // Si déjà payé, retour immédiat (idempotence)
    if (order.status === PAYMENT_STATUS.PAID) {
      console.log(`[Payment] Callback idempotent pour oid=${oid}, déjà PAID`);
      return { status: 'success', message: 'Paiement déjà traité' };
    }

    // 2. Sécurité : Vérifier le Hash
    if (HASH) {
      const isValid = verifyCmiHash(
        HASH,
        payload,
        this.config.get<string>('CMI_STORE_KEY')!,
        this.config.get<string>('CMI_HASH_ORDER')!,
        this.config.get<string>('CMI_HASH_ALGO')!,
        this.config.get<string>('CMI_HASH_OUTPUT') as 'base64' | 'hex',
      );

      if (!isValid) {
        throw new UnauthorizedException('Hash CMI invalide');
      }
    }

    // 3. Validation : Vérifier ProcReturnCode ou Response
    const isSuccess =
      ProcReturnCode === '00' ||
      Response?.toLowerCase() === 'approved';

    // 4. Mise à jour du PaymentOrder
    const updatedOrder = await this.prisma.paymentOrder.update({
      where: { oid },
      data: {
        status: isSuccess ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED,
        paidAt: isSuccess ? new Date() : undefined,
        procReturnCode: ProcReturnCode,
        response: Response,
        transId: TransId,
        rawCallback: payload as any,
      },
    });

    // 5. Si succès, activer le plan
    if (isSuccess) {
      await this.activatePlan(updatedOrder);
    }

    return {
      status: isSuccess ? 'success' : 'failed',
      message: isSuccess ? 'Paiement validé' : 'Paiement échoué',
    };
  }

  /**
   * Active le plan (Premium ou Boost) après paiement validé.
   * Utilise une transaction pour garantir la cohérence.
   */
  private async activatePlan(order: any) {
    const now = new Date();
    const plan = PAYMENT_PLANS[order.planType as PlanType];

    await this.prisma.$transaction(async (tx) => {
      if (order.planType === 'BOOST') {
        // Créer un ProBoost
        const startsAt = now;
        const endsAt = new Date(now.getTime() + BOOST_ACTIVE_DAYS * 24 * 60 * 60 * 1000);

        await tx.proBoost.create({
          data: {
            pro: {
              connect: { userId: order.proUserId },
            },
            city: {
              connect: { id: order.cityId! },
            },
            category: {
              connect: { id: order.categoryId! },
            },
            status: BoostStatus.ACTIVE,
            startsAt,
            endsAt,
            priceMad: Math.round(plan.priceMad),
          },
        });

        // Update ProProfile.boostActiveUntil
        await tx.proProfile.update({
          where: { userId: order.proUserId },
          data: { boostActiveUntil: endsAt },
        });
      } else {
        // PREMIUM_MONTHLY ou PREMIUM_ANNUAL
        const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

        // Chercher une souscription active existante
        const existingSubscription = await tx.proSubscription.findFirst({
          where: {
            proUserId: order.proUserId,
            status: SubscriptionStatus.ACTIVE,
          },
        });

        const subscriptionPlan = order.planType === 'PREMIUM_MONTHLY'
          ? SubscriptionPlan.PREMIUM_MONTHLY_NO_COMMIT
          : SubscriptionPlan.PREMIUM_ANNUAL_COMMIT;

        const subscriptionData = {
          plan: subscriptionPlan,
          status: SubscriptionStatus.ACTIVE,
          priceMad: Math.round(plan.priceMad),
          startedAt: now,
          commitmentStartsAt: order.planType === 'PREMIUM_ANNUAL' ? now : undefined,
          commitmentEndsAt: order.planType === 'PREMIUM_ANNUAL' ? endsAt : undefined,
        };

        if (existingSubscription) {
          // Mettre à jour la souscription existante
          await tx.proSubscription.update({
            where: { id: existingSubscription.id },
            data: subscriptionData,
          });
        } else {
          // Créer une nouvelle souscription
          await tx.proSubscription.create({
            data: {
              pro: {
                connect: { userId: order.proUserId },
              },
              ...subscriptionData,
            },
          });
        }

        // Update ProProfile
        await tx.proProfile.update({
          where: { userId: order.proUserId },
          data: {
            isPremium: true,
            premiumActiveUntil: endsAt,
          },
        });
      }
    });

    console.log(`[Payment] Plan activé : ${order.planType} pour userId=${order.proUserId}`);
  }
}
