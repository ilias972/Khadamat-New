import { z } from 'zod';

/**
 * UpdateProProfileSchema
 *
 * Permet au PRO de mettre à jour son profil :
 * - whatsapp : Numéro WhatsApp (format téléphone marocain)
 * - cityId : Correction de la ville (optionnel)
 */
export const UpdateProProfileSchema = z.object({
  whatsapp: z
    .string()
    .regex(/^(06|07)\d{8}$/, 'Format invalide. Ex: 0612345678'),
  cityId: z.string().cuid().optional(),
});

export type UpdateProProfileInput = z.infer<typeof UpdateProProfileSchema>;

/**
 * ProServiceSchema
 *
 * Définition d'un service proposé par le PRO :
 * - categoryId : Catégorie du service (plomberie, électricité, etc.)
 * - pricingType : Type de tarification (FIXED ou RANGE)
 * - fixedPriceMad : Prix fixe (requis si FIXED)
 * - minPriceMad : Prix minimum (requis si RANGE)
 * - maxPriceMad : Prix maximum (requis si RANGE)
 * - isActive : Service actif ou non
 *
 * ⚠️ Validation Zod Refine :
 * - Si pricingType === 'FIXED', alors fixedPriceMad est requis
 * - Si pricingType === 'RANGE', alors minPriceMad ET maxPriceMad sont requis
 */
export const ProServiceSchema = z
  .object({
    categoryId: z.string().cuid(),
    pricingType: z.enum(['FIXED', 'RANGE']),
    fixedPriceMad: z.number().int().positive().optional(),
    minPriceMad: z.number().int().positive().optional(),
    maxPriceMad: z.number().int().positive().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // Si FIXED, fixedPriceMad est requis
      if (data.pricingType === 'FIXED' && !data.fixedPriceMad) {
        return false;
      }
      // Si RANGE, minPriceMad ET maxPriceMad sont requis
      if (
        data.pricingType === 'RANGE' &&
        (!data.minPriceMad || !data.maxPriceMad)
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        'Pour FIXED, fixedPriceMad est requis. Pour RANGE, minPriceMad et maxPriceMad sont requis.',
    },
  )
  .refine(
    (data) => {
      // Si RANGE, minPriceMad doit être inférieur à maxPriceMad
      if (
        data.pricingType === 'RANGE' &&
        data.minPriceMad &&
        data.maxPriceMad &&
        data.minPriceMad >= data.maxPriceMad
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'minPriceMad doit être inférieur à maxPriceMad',
    },
  );

export type ProServiceInput = z.infer<typeof ProServiceSchema>;

/**
 * UpdateServicesSchema
 *
 * Array de services pour mise à jour (stratégie UPSERT)
 */
export const UpdateServicesSchema = z.array(ProServiceSchema);

export type UpdateServicesInput = z.infer<typeof UpdateServicesSchema>;

/**
 * AvailabilitySlotSchema
 *
 * Définition d'un créneau de disponibilité hebdomadaire :
 * - dayOfWeek : Jour de la semaine (0=Dimanche, 1=Lundi, ..., 6=Samedi)
 * - startMin : Heure de début en minutes depuis 00:00 (ex: 9h00 = 540)
 * - endMin : Heure de fin en minutes depuis 00:00 (ex: 18h00 = 1080)
 * - isActive : Créneau actif ou non
 */
export const AvailabilitySlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0).max(1439), // 23h59 = 1439 minutes
    endMin: z.number().int().min(0).max(1439),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => data.startMin < data.endMin,
    {
      message: 'startMin doit être inférieur à endMin',
    },
  );

export type AvailabilitySlotInput = z.infer<typeof AvailabilitySlotSchema>;

/**
 * UpdateAvailabilitySchema
 *
 * Array de créneaux pour mise à jour (stratégie REPLACE ALL)
 */
export const UpdateAvailabilitySchema = z.array(AvailabilitySlotSchema);

export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;
