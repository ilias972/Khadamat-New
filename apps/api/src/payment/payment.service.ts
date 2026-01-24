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

    if (dto.planType === 'BOOST') {
      if (!dto.cityId || !dto.categoryId) throw new BadRequestException('Infos manquantes pour BOOST');
      if (proProfile.isPremium && proProfile.premiumActiveUntil && proProfile.premiumActiveUntil > now) {
        throw new BadRequestException('Exclusivité: Premium déjà actif');
      }
      // Check Cooldown...
    } else {
      if (proProfile.boostActiveUntil && proProfile.boostActiveUntil > now) {
        throw new BadRequestException('Exclusivité: Boost déjà actif');
      }
    }

    // 3. Préparation des Données
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const oid = `CMD-${timestamp}-${random}`;
    // IMPORTANT : CMI veut "3000.00", pas "3000"
    const formattedAmount = Number(plan.priceMad).toFixed(2);
    const rnd = Math.random().toString(36).substring(2, 15);
    const amountCents = Math.round(plan.priceMad * 100);

    // 4. Enregistrement DB
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

    // 5. Configuration CMI
    const publicUrl = this.config.get<string>('PUBLIC_URL');
    if (!publicUrl) throw new BadRequestException("PUBLIC_URL manquante");

    const okUrl = `${publicUrl}/api/payment/callback`;
    const failUrl = `${publicUrl}/api/payment/callback`;

    // Nettoyage des données Client (Crucial pour éviter 3D-1004)
    const rawName = `${proProfile.user.firstName || ''} ${proProfile.user.lastName || ''}`;
    const safeName = (rawName.trim() || 'Client Khadamat').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    const safeEmail = proProfile.user.email || 'client@khadamat.ma';

    // 6. Construction des Paramètres (Champs envoyés au Front)
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
      
      // Champs additionnels recommandés pour éviter les rejets
      lang: 'fr',
      email: safeEmail,
      BillToName: safeName,
      BillToCompany: 'Pro Khadamat',
      BillToStreet1: 'Adresse Client',
      BillToCity: 'Casablanca',
      BillToCountry: '504',
      encoding: 'UTF-8',
      // On force le HashAlgorithm pour dire à CMI qu'on utilise SHA1 (si supporté)
      hashAlgorithm: 'ver3', // Souvent synonyme de SHA1/Base64 sur les vieilles docs
    };

    if (process.env.NODE_ENV !== 'production') {
      Object.freeze(cmiParams);
    }

    // 7. Génération du Hash
    // On force SHA1 et Base64 car c'est ce que le serveur CMI utilise dans ses réponses
    const hashAlgo = 'sha1'; 
    const hashOutput = 'base64';
    const hashOrder = this.config.get<string>('CMI_HASH_ORDER')!;

    const signature = generateCmiHash(
      cmiParams,
      this.config.get<string>('CMI_STORE_KEY')!,
      hashOrder,
      hashAlgo,
      hashOutput,
    );

    // 8. LOG "ESPION" (Demandé par GPT)
    // On loggue exactement ce qui part au front pour vérifier les noms de champs
    const finalResponse = {
      actionUrl: this.config.get<string>('CMI_BASE_URL'),
      fields: {
        ...cmiParams,
        hash: signature,
        shopurl: this.config.get<string>('FRONTEND_URL'),
      },
    };

    console.log('🕵️‍♂️ [SPY MODE] Données envoyées au Frontend :', JSON.stringify(finalResponse.fields, null, 2));

    return finalResponse;
  }

  /**
   * Traitement du Callback (Réponse CMI)
   */
  async handleCallback(data: any) {
    console.log('📥 --- CMI CALLBACK RECEIVED ---');
    console.log(JSON.stringify(data, null, 2));

    const { oid, Response, ProcReturnCode, HASH, hash, ErrCode, ErrMsg } = data;
    const receivedHash = HASH || hash;

    // 1. Gestion des Erreurs Explicites (3D-1004, etc.)
    if (Response === 'Error' || ErrCode || Response === 'Refused') {
      this.logger.warn(`⚠️ Erreur CMI : ${ErrCode || ProcReturnCode} - ${ErrMsg || Response}`);
      
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
      return { status: 'failed', message: 'Erreur CMI enregistrée' };
    }

    // 2. Vérification Hash (SHA1 / Base64)
    if (!receivedHash) throw new UnauthorizedException('Hash manquant');

    const storeKey = this.config.get<string>('CMI_STORE_KEY')!;
    // Ordre standard de RETOUR (Client ID + OID + Amount + Currency + Rnd + Response + StoreType + TranType + Key)
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

    const stringToHash = params.map((val) => (val === undefined || val === null ? '' : val)).join('') + storeKey;
    
    // Calcul SHA1 / Base64
    const calculatedHash = createHash('sha1').update(stringToHash).digest('base64');

    console.log('🔐 Hash Check:', { calculated: calculatedHash, received: receivedHash });

    if (calculatedHash !== receivedHash) {
       this.logger.error('❌ ECHEC VALIDATION HASH');
       throw new UnauthorizedException('Hash CMI invalide');
    }

    // 3. Succès
    const isSuccess = (ProcReturnCode === '00' || ProcReturnCode === 0) && Response === 'Approved';

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
    }

    return { status: isSuccess ? 'success' : 'failed', message: 'Callback traité' };
  }

  // ... (Garde ta méthode activatePlan inchangée, elle est parfaite)
  private async activatePlan(order: any) {
    const now = new Date();
    const plan = PAYMENT_PLANS[order.planType as PlanType];

    await this.prisma.$transaction(async (tx) => {
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
      } else {
        const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        const existingSubscription = await tx.proSubscription.findFirst({
          where: { proUserId: order.proUserId, status: SubscriptionStatus.ACTIVE },
        });
        const subscriptionPlan = order.planType === 'PREMIUM_MONTHLY' ? SubscriptionPlan.PREMIUM_MONTHLY_NO_COMMIT : SubscriptionPlan.PREMIUM_ANNUAL_COMMIT;
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
          await tx.proSubscription.update({ where: { id: existingSubscription.id }, data: subscriptionData });
        } else {
          await tx.proSubscription.create({
            data: {
              pro: { connect: { userId: order.proUserId } },
              transactionId: order.oid,
              ...subscriptionData,
            },
          });
        }
        await tx.proProfile.update({ where: { userId: order.proUserId }, data: { isPremium: true, premiumActiveUntil: endsAt } });
      }
    });
    console.log(`[Payment] Plan activé : ${order.planType} pour userId=${order.proUserId}`);
  }
}
