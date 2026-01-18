import { z } from 'zod';

/**
 * GetSlotsSchema
 * Récupère les créneaux disponibles pour un Pro à une date donnée
 * - proId : ID du professionnel
 * - date : Date au format YYYY-MM-DD
 * - categoryId : ID de la catégorie de service
 */
export const GetSlotsSchema = z.object({
  proId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)'),
  categoryId: z.string().cuid(),
});

export type GetSlotsInput = z.infer<typeof GetSlotsSchema>;

/**
 * CreateBookingSchema
 * Crée une réservation pour un client
 * - proId : ID du professionnel
 * - categoryId : ID de la catégorie de service
 * - date : Date au format YYYY-MM-DD
 * - time : Heure au format HH:MM
 *
 * Le backend combinera date + time pour créer le timeSlot (DateTime)
 */
export const CreateBookingSchema = z.object({
  proId: z.string().cuid(),
  categoryId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format heure invalide (HH:MM)'),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
