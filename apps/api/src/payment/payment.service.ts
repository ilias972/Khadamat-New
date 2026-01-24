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
import { createHash } from 'crypto';

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

    // 5. Construction de l'objet CMI FINAL
    const publicUrl = this.config.get<string>('PUBLIC_URL');

    if (!publicUrl) {
      throw new BadRequestException(
        "PUBLIC_URL n'est pas configurée. Configurez-la avec Ngrok ou votre domaine.",
      );
    }

    // Architecture API-First (Ngrok)
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

    // 6. FREEZE pour prévenir toute mutation
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

    // 8. Génération du Hash
    // On force les valeurs par défaut SHA1/Base64 si non définies, suite à tes logs
    const hashAlgo = this.config.get<string>('CMI_HASH_ALGO') || 'sha1';
    const hashOutput = this.config.get<string>('CMI_HASH_OUTPUT') || 'base64';
    const hashOrder = this.config.get<string>('CMI_HASH_ORDER')!;

    const signature = generateCmiHash(
      cmiParams,
      this.config.get<string>('CMI_STORE_KEY')!,
      hashOrder,
      hashAlgo,
      hashOutput as 'base64' | 'hex',
    );

    console.log('🔒 CMI Signature Generated:', signature);

    // 9. Retour STRICT
    return {
      actionUrl: this.config.get<string>('CMI_BASE_URL'),
      fields: {
        ...cmiParams,
        hash: signature,
        shopurl: this.config.get<string>('FRONTEND_URL'),
        lang: 'fr',
      },
    };
  }

  /**
   * Traite le callback CMI.
   * Gère les succès ET les erreurs sans bloquer sur le hash si c'est une erreur explicite.
   */
  async handleCallback(data: any) {
    console.log('📥 --- CMI CALLBACK RECEIVED ---');
    console.log(JSON.stringify(data, null, 2));

    const { oid, Response, ProcReturnCode, HASH, hash, ErrCode, ErrMsg } = data;
    const receivedHash = HASH || hash;

    // 1. DÉTECTION RAPIDE D'ERREUR CMI (Pour éviter le blocage 401)
    // Si CMI dit "Error" ou envoie un code erreur (ex: 3D-1004), on accepte le callback comme un échec valide.
    if (Response === 'Error' || ErrCode) {
      this.logger.warn(`⚠️ Erreur CMI reçue : ${ErrCode} - ${ErrMsg}`);
      
      // Mise à jour de la commande en FAILED
      const order = await this.prisma.paymentOrder.findUnique({ where: { oid } });
      if (order) {
        await this.prisma.paymentOrder.update({
          where: { oid },
          data: {
            status: PAYMENT_STATUS.FAILED,
            response: Response || 'Error',
            procReturnCode: String(ProcReturnCode || ErrCode || '99'),
            rawCallback: data,
          },
        });
      }
      
      // On retourne un succès HTTP pour dire à CMI "J'ai bien reçu l'info d'erreur",
      // sinon CMI va réessayer de nous envoyer l'erreur en boucle.
      return { status: 'failed', message: 'Erreur CMI enregistrée' };
    }

    // 2. VÉRIFICATION STANDARD DU HASH (Uniquement si pas d'erreur explicite)
    if (!receivedHash) {
      throw new UnauthorizedException('Hash manquant dans le callback');
    }

    const storeKey = this.config.get<string>('CMI_STORE_KEY')!;
    // Config alignée sur tes derniers logs (SHA1 / Base64 par défaut)
    const hashAlgo = this.config.get<string>('CMI_HASH_ALGO') || 'sha1';
    const hashOutput = this.config.get<string>('CMI_HASH_OUTPUT') || 'base64';

    // Ordre standard CMI pour le RETOUR (différent de l'aller)
    // clientid + oid + amount + currency + rnd + Response + storetype + trantype + storeKey
    const params = [
      data.clientid,
      data.oid,
      data.amount,
      data.currency,
      data.rnd,
      data.Response,
      data.storetype,
      data.trantype,
    ];

    // Construction de la string
    const stringToHash = params.map((val) => (val === undefined || val === null ? '' : val)).join('') + storeKey;

    // Calcul
    const calculatedHash = createHash(hashAlgo).update(stringToHash).digest(hashOutput as any);

    console.log('🔐 Hash Check:', { calculated: calculatedHash, received: receivedHash });

    if (calculatedHash !== receivedHash) {
      // Tolérance minuscules/majuscules pour le Hex/Base64
      if (calculatedHash.toLowerCase() !== receivedHash.toLowerCase()) {
         this.logger.error('❌ ECHEC VALIDATION HASH');
         throw new UnauthorizedException('Hash CMI invalide');
      }
    }

    // 3. TRAITEMENT DU SUCCÈS
    const isSuccess = (ProcReturnCode === '00' || ProcReturnCode === 0) && Response === 'Approved';

    // Mise à jour DB
    const updatedOrder = await this.prisma.paymentOrder.update({
      where: { oid },
      data: {
        status: isSuccess ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED,
        paidAt: isSuccess ? new Date() : undefined,
        procReturnCode: String(ProcReturnCode),
        response: Response,
        transId: data.TransId,
        rawCallback: data,
      },
    });

    if (isSuccess) {
      this.logger.log(`✅ PAIEMENT RÉUSSI pour ${oid}`);
      await this.activatePlan(updatedOrder);
    } else {
      this.logger.warn(`⚠️ PAIEMENT REFUSÉ pour ${oid}`);
    }

    return { status: isSuccess ? 'success' : 'failed', message: 'Callback traité' };
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
              transactionId: order.oid, // ✅ Fonctionne car tu as fait la migration
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
