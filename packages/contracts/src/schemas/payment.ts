import { z } from 'zod';

/**
 * Plan Types - Alignés avec la tarification produit
 */
export const PlanTypeSchema = z.enum([
  'PREMIUM_MONTHLY',  // 350 MAD/mois - Récurrent Stripe
  'PREMIUM_ANNUAL',   // 3000 MAD - Paiement unique (1 an)
  'BOOST',            // 299 MAD - Paiement unique (7 jours)
]);

export type PlanType = z.infer<typeof PlanTypeSchema>;

/**
 * CreateCheckoutSessionSchema
 * Input pour créer une session Stripe Checkout
 */
export const CreateCheckoutSessionSchema = z.object({
  planType: PlanTypeSchema,

  // Pour BOOST uniquement : ciblage géographique et catégorie
  cityId: z.string().optional(),
  categoryId: z.string().optional(),
}).refine(
  (data) => {
    // Si planType est BOOST, cityId et categoryId sont requis
    if (data.planType === 'BOOST') {
      return !!data.cityId && !!data.categoryId;
    }
    return true;
  },
  {
    message: 'cityId et categoryId sont requis pour le plan BOOST',
    path: ['cityId'],
  }
);

export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionSchema>;

/**
 * CheckoutSessionResponseSchema
 * Réponse après création de session
 */
export const CheckoutSessionResponseSchema = z.object({
  sessionId: z.string(),
  url: z.string(), // URL Stripe Checkout
});

export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponseSchema>;
