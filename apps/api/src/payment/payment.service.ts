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

    // 3. Génération de l'oid unique
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const oid = `CMD-${timestamp}-${random}`;

    // 4. Conversion montant en centimes et formatage strict
    const amountCents = Math.round(plan.priceMad * 100);
    // CRITIQUE : Formater le montant avec exactement 2 décimales
    const formattedAmount = Number(plan.priceMad).toFixed(2);

    // 5. Création du PaymentOrder
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

    // 6. Préparation des paramètres CMI - TOUTES les valeurs finales
    const publicUrl = this.config.get<string>('PUBLIC_URL');
    const rnd = Math.random().toString(36).substring(2, 15); // Random stable

    // Construire l'objet params avec toutes les valeurs finales
    const cmiParams = {
      clientid: this.config.get<string>('CMI_CLIENT_ID')!,
      oid,
      amount: formattedAmount, // Utilise formattedAmount unique
      okUrl: `${publicUrl}/api/payment/callback`,
      failUrl: `${publicUrl}/api/payment/callback`,
      rnd,
      storetype: this.config.get<string>('CMI_STORE_TYPE')!,
      trantype: this.config.get<string>('CMI_TRAN_TYPE')!,
      currency: this.config.get<string>('CMI_CURRENCY')!,
    };

    // 7. Logs de debug AVANT la génération du hash
    const hashOrder = this.config.get<string>('CMI_HASH_ORDER')!;
    const fields = hashOrder.split(',').map((f) => f.trim());
    const orderedValues = fields.map((field) => cmiParams[field as keyof typeof cmiParams]);
    const hashString = orderedValues.join('');

    console.log('🧮 --- CMI DEBUG START ---');
    console.log('1. Ordered Fields used for Hash:', {
      ...cmiParams,
      _note: 'Ces valeurs exactes seront concaténées pour le hash',
    });
    console.log('2. Hash Order from Config:', hashOrder);
    console.log('3. Ordered Values Array:', orderedValues);
    console.log('4. Raw String to Hash (before storeKey):', hashString);
    console.log('5. Store Key Check:', {
      present: !!this.config.get('CMI_STORE_KEY'),
      length: this.config.get('CMI_STORE_KEY')?.length,
      _note: 'Key itself is NOT logged for security',
    });
    console.log('6. Hash Algorithm:', this.config.get('CMI_HASH_ALGO'));
    console.log('7. Hash Output Format:', this.config.get('CMI_HASH_OUTPUT'));
    console.log('🧮 --- CMI DEBUG END ---');

    // 8. Génération du Hash avec les valeurs exactes de cmiParams
    const hash = generateCmiHash(
      cmiParams,
      this.config.get<string>('CMI_STORE_KEY')!,
      hashOrder,
      this.config.get<string>('CMI_HASH_ALGO')!,
      this.config.get<string>('CMI_HASH_OUTPUT') as 'base64' | 'hex',
    );

    console.log('8. Generated Hash:', hash);

    // 9. Retour des données pour le formulaire HTML
    // CRITIQUE : Utiliser exactement les mêmes valeurs que celles utilisées pour le hash
    return {
      actionUrl: this.config.get<string>('CMI_BASE_URL'),
      fields: {
        ...cmiParams, // Utilise le même objet que pour le hash
        hash, // Ajoute le hash généré
        // Champs optionnels pour améliorer l'UX
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
