import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BoostStatus,
} from './types/prisma-enums';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { generateCmiHash } from './utils/cmi-hash';
import {
  PAYMENT_PLANS,
  PAYMENT_STATUS,
  BOOST_COOLDOWN_DAYS,
  BOOST_ACTIVE_DAYS,
  PlanType,
} from './utils/payment.constants';
import { createHash } from 'crypto'; // <--- AJOUT IMPORTANT

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Initie un paiement CMI.
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
        throw new BadRequestException(
          'cityId et categoryId sont requis pour BOOST',
        );
      }

      // Vérif exclusivité : Premium actif ?
      if (
        proProfile.isPremium &&
        proProfile.premiumActiveUntil &&
        proProfile.premiumActiveUntil > now
      ) {
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
          (now.getTime() - lastBoost.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
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

    if (!publicUrl) {
      throw new BadRequestException(
        "PUBLIC_URL n'est pas configurée dans les variables d'environnement. " +
          'Configurez PUBLIC_URL avec votre URL Ngrok ou domaine public.',
      );
    }

    // Construction des URLs de callback (Architecture API-First)
    const okUrl = `${publicUrl}/api/payment/callback`;
    const failUrl = `${publicUrl}/api/payment/callback`;

    console.log('🔗 CMI URLs used:', { okUrl, failUrl });

    const cmiParams = {
      clientid: this.config.get<string>('CMI_CLIENT_ID')!,
      oid,
      amount: formattedAmount,
      okUrl,
      failUrl,
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
   * VERSION DEBUG SCANNER - Vérifie manuellement le Hash
   */
  async handleCallback(data: any) {
    // 1. LOGS BRUTS (Pour voir ce que CMI envoie vraiment)
    console.log('📥 --- CMI CALLBACK RAW DATA START ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('📥 --- CMI CALLBACK RAW DATA END ---');

    // Extraction du Hash reçu
    const receivedHash = data.HASH || data.hash;

    if (!receivedHash) {
      this.logger.error('❌ Callback reçu sans Hash');
      throw new UnauthorizedException('Hash manquant dans le callback');
    }

    // 2. Configuration pour la vérification
    const storeKey = this.config.get<string>('CMI_STORE_KEY')!;
    const hashAlgo = this.config.get<string>('CMI_HASH_ALGO') || 'sha512';
    // On force la lecture en HEX comme configuré dans ton .env
    const hashOutput = this.config.get<string>('CMI_HASH_OUTPUT') || 'hex';

    // 3. Construction de la chaîne à hacher (ORDRE SPÉCIFIQUE AU RETOUR)
    // CMI Standard pour 3D_PAY_HOSTING :
    // clientid + oid + amount + currency + rnd + Response + storetype + trantype + storeKey
    const params = [
      data.clientid,
      data.oid,
      data.amount,
      data.currency,
      data.rnd,
      data.Response, // <--- C'est lui qui change tout !
      data.storetype,
      data.trantype,
    ];

    // Gestion des valeurs null/undefined (CMI peut renvoyer vide parfois)
    const stringToHash =
      params.map((val) => (val === undefined || val === null ? '' : val)).join('') +
      storeKey;

    // 4. Calcul du Hash local
    const calculatedHash = createHash(hashAlgo)
      .update(stringToHash)
      .digest(hashOutput as any);

    // 5. DEBUG COMPARATIF (Le moment de vérité)
    console.log('🔐 --- CMI HASH VERIFICATION ---');
    console.log('1. String Hachée :', stringToHash.replace(storeKey, '***KEY***'));
    console.log('2. Hash Attendu (Calculé) :', calculatedHash);
    console.log('3. Hash Reçu (CMI)        :', receivedHash);
    console.log('4. Match ?                :', calculatedHash.toLowerCase() === receivedHash.toLowerCase());
    console.log('🔐 -----------------------------');

    // 6. Validation
    if (calculatedHash.toLowerCase() !== receivedHash.toLowerCase()) {
      // TENTATIVE DE SAUVETAGE (Si CMI renvoie du Base64 alors qu'on attend du Hex)
      const fallbackHash = createHash(hashAlgo)
        .update(stringToHash)
        .digest('base64');
      
      if (fallbackHash === receivedHash) {
        this.logger.warn(
          "⚠️ Attention: CMI renvoie du Base64 alors que la config est HEX. J'accepte exceptionnellement.",
        );
      } else {
        this.logger.error('❌ ECHEC VALIDATION HASH');
        throw new UnauthorizedException('Hash CMI invalide : Signature incorrecte');
      }
    }

    // 7. Traitement de la commande
    const { oid, ProcReturnCode, Response, TransId } = data;

    // Chercher le PaymentOrder
    const order = await this.prisma.paymentOrder.findUnique({
      where: { oid },
    });

    if (!order) {
      throw new NotFoundException(`Commande ${oid} non trouvée`);
    }

    // Idempotence
    if (order.status === PAYMENT_STATUS.PAID) {
      console.log(`[Payment] Callback idempotent pour oid=${oid}, déjà PAID`);
      return { status: 'success', message: 'Paiement déjà traité' };
    }

    // Vérifier le succès
    const isSuccess =
      (ProcReturnCode === '00' || ProcReturnCode === 0) &&
      Response?.toLowerCase() === 'approved';

    // Mise à jour du PaymentOrder
    const updatedOrder = await this.prisma.paymentOrder.update({
      where: { oid },
      data: {
        status: isSuccess ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED,
        paidAt: isSuccess ? new Date() : undefined,
        procReturnCode: String(ProcReturnCode), // Force string
        response: Response,
        transId: TransId,
        rawCallback: data,
      },
    });

    // Si succès, activer le plan
    if (isSuccess) {
      this.logger.log(`✅ PAIEMENT RÉUSSI pour ${oid}`);
      await this.activatePlan(updatedOrder);
    } else {
      this.logger.warn(`⚠️ PAIEMENT ÉCHOUÉ pour ${oid} : ${data.ErrMsg}`);
    }

    return {
      status: isSuccess ? 'success' : 'failed',
      message: isSuccess ? 'Paiement validé' : 'Paiement échoué',
    };
  }

  /**
   * Active le plan (Premium ou Boost) après paiement validé.
   */
  private async activatePlan(order: any) {
    const now = new Date();
    const plan = PAYMENT_PLANS[order.planType as PlanType];

    await this.prisma.$transaction(async (tx) => {
      if (order.planType === 'BOOST') {
        const startsAt = now;
        const endsAt = new Date(
          now.getTime() + BOOST_ACTIVE_DAYS * 24 * 60 * 60 * 1000,
        );

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
      } else {
        const endsAt = new Date(
          now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
        );

        const existingSubscription = await tx.proSubscription.findFirst({
          where: {
            proUserId: order.proUserId,
            status: SubscriptionStatus.ACTIVE,
          },
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
          commitmentStartsAt:
            order.planType === 'PREMIUM_ANNUAL' ? now : undefined,
          commitmentEndsAt:
            order.planType === 'PREMIUM_ANNUAL' ? endsAt : undefined,
          endDate: endsAt, // AJOUT IMPORTANT POUR LE SUIVI
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
              transactionId: order.oid, // Lien important
              ...subscriptionData,
            },
          });
        }

        await tx.proProfile.update({
          where: { userId: order.proUserId },
          data: {
            isPremium: true,
            premiumActiveUntil: endsAt,
          },
        });
      }
    });

    console.log(
      `[Payment] Plan activé : ${order.planType} pour userId=${order.proUserId}`,
    );
  }
}
