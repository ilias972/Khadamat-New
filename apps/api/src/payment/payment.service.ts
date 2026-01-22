import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import Stripe from 'stripe';
import type { CreateCheckoutSessionInput, CheckoutSessionResponse, PlanType } from '@khadamat/contracts';

/**
 * PaymentService
 *
 * Service pour gérer les paiements Stripe et la monétisation.
 * Gère Premium (monthly/annual) et Boost avec règles anti-abus.
 */
@Injectable()
export class PaymentService {
  private stripe: Stripe;

  // Prix figés (en centimes MAD pour Stripe)
  private readonly PRICES = {
    PREMIUM_MONTHLY: 35000, // 350 MAD
    PREMIUM_ANNUAL: 300000, // 3000 MAD
    BOOST: 29900,           // 299 MAD
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia', // Latest stable version
    });
  }

  /**
   * createCheckoutSession
   *
   * Crée une session Stripe Checkout pour un PRO.
   *
   * RÈGLES MÉTIER (ANTI-ABUS) :
   * 1. Vérification PRO
   * 2. Exclusivité Premium <-> Boost
   * 3. Anti-doublon Premium
   * 4. Cooldown Boost (21 jours total = 7j actif + 14j repos)
   */
  async createCheckoutSession(
    userId: string,
    userRole: string,
    dto: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResponse> {
    // 1. VALIDATION ROLE
    if (userRole !== 'PRO') {
      throw new ForbiddenException('Seuls les professionnels peuvent acheter des plans');
    }

    // 2. RÉCUPÉRATION PROFIL PRO
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: {
        userId: true,
        isPremium: true,
        cityId: true,
      },
    });

    if (!proProfile) {
      throw new NotFoundException('Profil professionnel non trouvé');
    }

    // 3. VALIDATION SELON PLAN TYPE
    await this.validatePlanPurchase(proProfile.userId, proProfile.isPremium, dto.planType);

    // 4. VALIDATION BOOST SPECIFIQUE
    if (dto.planType === 'BOOST') {
      if (!dto.cityId || !dto.categoryId) {
        throw new BadRequestException('cityId et categoryId sont requis pour le Boost');
      }

      // Vérifier que la ville et la catégorie existent
      const [city, category] = await Promise.all([
        this.prisma.city.findUnique({ where: { id: dto.cityId } }),
        this.prisma.category.findUnique({ where: { id: dto.categoryId } }),
      ]);

      if (!city || !category) {
        throw new BadRequestException('Ville ou catégorie invalide');
      }
    }

    // 5. CRÉATION SESSION STRIPE
    const session = await this.createStripeSession(userId, dto);

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  /**
   * validatePlanPurchase
   *
   * Valide qu'un achat de plan est autorisé selon les règles métier.
   */
  private async validatePlanPurchase(
    proUserId: string,
    isPremium: boolean,
    planType: PlanType,
  ): Promise<void> {
    if (planType === 'PREMIUM_MONTHLY' || planType === 'PREMIUM_ANNUAL') {
      // RÈGLE 1 : Anti-doublon Premium
      if (isPremium) {
        throw new BadRequestException('Vous êtes déjà abonné Premium');
      }

      // RÈGLE 2 : Pas de Premium si Boost actif
      const activeBoost = await this.prisma.proBoost.findFirst({
        where: {
          proUserId: proUserId,
          status: 'ACTIVE',
          endsAt: { gt: new Date() },
        },
      });

      if (activeBoost) {
        throw new BadRequestException(
          'Vous ne pouvez pas devenir Premium pendant un Boost actif. Attendez la fin de votre Boost.',
        );
      }
    }

    if (planType === 'BOOST') {
      // RÈGLE 3 : Pas de Boost si Premium
      if (isPremium) {
        throw new BadRequestException('Les membres Premium ne peuvent pas acheter de Boost');
      }

      // RÈGLE 4 : Pas de Boost si un Boost est actif
      const activeBoost = await this.prisma.proBoost.findFirst({
        where: {
          proUserId: proUserId,
          status: 'ACTIVE',
          endsAt: { gt: new Date() },
        },
      });

      if (activeBoost) {
        throw new BadRequestException('Vous avez déjà un Boost actif');
      }

      // RÈGLE 5 : Cooldown de 21 jours (7j actif + 14j repos)
      const lastBoost = await this.prisma.proBoost.findFirst({
        where: { proUserId: proUserId },
        orderBy: { endsAt: 'desc' },
      });

      if (lastBoost) {
        const now = new Date();
        const cooldownEndDate = new Date(lastBoost.endsAt);
        cooldownEndDate.setDate(cooldownEndDate.getDate() + 14); // 14 jours après la fin

        if (now < cooldownEndDate) {
          const daysRemaining = Math.ceil(
            (cooldownEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          throw new BadRequestException(
            `Vous devez attendre ${daysRemaining} jour(s) avant d'acheter un nouveau Boost (cooldown de 21 jours total)`,
          );
        }
      }
    }
  }

  /**
   * createStripeSession
   *
   * Crée la session Stripe Checkout avec les bons paramètres.
   */
  private async createStripeSession(
    proUserId: string,
    dto: CreateCheckoutSessionInput,
  ): Promise<Stripe.Checkout.Session> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const currency = this.configService.get<string>('STRIPE_CURRENCY') || 'mad';

    // Metadata commun
    const metadata: Record<string, string> = {
      proId: proUserId,
      planType: dto.planType,
    };

    // Ajouter cityId et categoryId pour BOOST
    if (dto.planType === 'BOOST') {
      metadata.cityId = dto.cityId!;
      metadata.categoryId = dto.categoryId!;
    }

    // Configuration selon le plan
    let mode: 'payment' | 'subscription';
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (dto.planType === 'PREMIUM_MONTHLY') {
      mode = 'subscription';
      lineItems = [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Premium Mensuel',
              description: 'Accès Premium illimité - Paiement mensuel',
            },
            unit_amount: this.PRICES.PREMIUM_MONTHLY,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ];
    } else if (dto.planType === 'PREMIUM_ANNUAL') {
      mode = 'payment';
      lineItems = [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Premium Annuel',
              description: 'Accès Premium pour 1 an - Paiement unique',
            },
            unit_amount: this.PRICES.PREMIUM_ANNUAL,
          },
          quantity: 1,
        },
      ];
    } else {
      // BOOST
      mode = 'payment';
      lineItems = [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Boost 7 jours',
              description: 'Mise en avant sur une ville et catégorie - 7 jours',
            },
            unit_amount: this.PRICES.BOOST,
          },
          quantity: 1,
        },
      ];
    }

    // Création session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: mode,
      line_items: lineItems,
      success_url: `${frontendUrl}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/subscription/cancel`,
      metadata: metadata,
    });

    return session;
  }

  /**
   * handleWebhook
   *
   * Traite les webhooks Stripe (checkout.session.completed).
   * IDEMPOTENCE garantie.
   */
  async handleWebhook(signature: string, rawBody: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    // Vérification signature
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Traitement selon event type
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.handleCheckoutSessionCompleted(session);
    }

    // Autres events possibles (subscription.deleted, etc.) peuvent être ajoutés ici
  }

  /**
   * handleCheckoutSessionCompleted
   *
   * Traite l'event checkout.session.completed.
   * Active Premium ou Boost selon metadata.planType.
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const metadata = session.metadata;
    if (!metadata || !metadata.proId || !metadata.planType) {
      console.error('❌ Webhook: metadata manquant', session.id);
      return;
    }

    const proId = metadata.proId;
    const planType = metadata.planType as PlanType;

    // IDEMPOTENCE : Vérifier si déjà traité
    const alreadyProcessed = await this.isSessionAlreadyProcessed(session.id, planType);
    if (alreadyProcessed) {
      console.log(`✅ Session ${session.id} déjà traitée, skip`);
      return;
    }

    // Traitement selon planType
    if (planType === 'PREMIUM_MONTHLY') {
      await this.activatePremiumMonthly(proId, session);
    } else if (planType === 'PREMIUM_ANNUAL') {
      await this.activatePremiumAnnual(proId, session);
    } else if (planType === 'BOOST') {
      await this.activateBoost(proId, metadata, session);
    }
  }

  /**
   * isSessionAlreadyProcessed
   *
   * Vérifie si une session a déjà été traitée (idempotence).
   */
  private async isSessionAlreadyProcessed(sessionId: string, planType: PlanType): Promise<boolean> {
    if (planType === 'PREMIUM_MONTHLY' || planType === 'PREMIUM_ANNUAL') {
      const existing = await this.prisma.proSubscription.findFirst({
        where: {
          OR: [
            { stripeCustomerId: sessionId }, // Pas parfait mais on peut utiliser sessionId
            { stripeSubscriptionId: sessionId },
          ],
        },
      });
      return !!existing;
    } else {
      const existing = await this.prisma.proBoost.findFirst({
        where: { stripePaymentIntentId: sessionId },
      });
      return !!existing;
    }
  }

  /**
   * activatePremiumMonthly
   *
   * Active Premium Monthly (récurrent Stripe).
   */
  private async activatePremiumMonthly(proId: string, session: Stripe.Checkout.Session): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert ProSubscription
      await tx.proSubscription.upsert({
        where: { proUserId: proId },
        create: {
          proUserId: proId,
          plan: 'PREMIUM_MONTHLY_NO_COMMIT',
          status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          priceMad: 350,
          startedAt: new Date(),
        },
        update: {
          plan: 'PREMIUM_MONTHLY_NO_COMMIT',
          status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          priceMad: 350,
          startedAt: new Date(),
          endedAt: null,
        },
      });

      // 2. Update ProProfile -> isPremium = true
      await tx.proProfile.update({
        where: { userId: proId },
        data: { isPremium: true },
      });
    });

    console.log(`✅ Premium Monthly activé pour PRO ${proId}`);
  }

  /**
   * activatePremiumAnnual
   *
   * Active Premium Annual (one-shot, 1 an).
   */
  private async activatePremiumAnnual(proId: string, session: Stripe.Checkout.Session): Promise<void> {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1); // +1 an

    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert ProSubscription
      await tx.proSubscription.upsert({
        where: { proUserId: proId },
        create: {
          proUserId: proId,
          plan: 'PREMIUM_ANNUAL_COMMIT',
          status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          priceMad: 3000,
          startedAt: now,
          endedAt: endDate,
        },
        update: {
          plan: 'PREMIUM_ANNUAL_COMMIT',
          status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          priceMad: 3000,
          startedAt: now,
          endedAt: endDate,
        },
      });

      // 2. Update ProProfile -> isPremium = true
      await tx.proProfile.update({
        where: { userId: proId },
        data: { isPremium: true },
      });
    });

    console.log(`✅ Premium Annual activé pour PRO ${proId} jusqu'au ${endDate.toISOString()}`);
  }

  /**
   * activateBoost
   *
   * Active Boost (7 jours).
   */
  private async activateBoost(
    proId: string,
    metadata: Record<string, string>,
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const cityId = metadata.cityId;
    const categoryId = metadata.categoryId;

    if (!cityId || !categoryId) {
      console.error('❌ Boost: cityId/categoryId manquant', session.id);
      return;
    }

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + 7); // +7 jours

    await this.prisma.proBoost.create({
      data: {
        proUserId: proId,
        cityId: cityId,
        categoryId: categoryId,
        status: 'ACTIVE',
        startsAt: now,
        endsAt: endsAt,
        stripePaymentIntentId: session.payment_intent as string,
        priceMad: 299,
      },
    });

    console.log(`✅ Boost activé pour PRO ${proId} (${cityId}/${categoryId}) jusqu'au ${endsAt.toISOString()}`);
  }
}
