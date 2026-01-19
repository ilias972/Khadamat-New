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

/**
 * UpdateBookingStatusSchema
 * Mise à jour du statut d'une réservation (PRO uniquement)
 * - status : Nouveau statut (CONFIRMED ou DECLINED)
 */
export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'DECLINED']),
});

export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>;

/**
 * BookingDashboardItem
 * Représente un booking dans le dashboard (Client ou Pro)
 */
export const BookingDashboardItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  timeSlot: z.string(), // ISO string
  estimatedDuration: z.string().nullable(),
  duration: z.number(), // Durée en heures (Phase 10 V4-A)
  isModifiedByPro: z.boolean(), // Flag de modification par PRO (Phase 10 V4-A)
  category: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  city: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }).optional(),
  // Pour le CLIENT: infos du PRO
  pro: z.object({
    user: z.object({
      firstName: z.string(),
      lastName: z.string(),
      phone: z.string(),
    }),
    city: z.object({
      name: z.string(),
    }),
  }).optional(),
  // Pour le PRO: infos du CLIENT
  client: z.object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
  }).optional(),
});

export type BookingDashboardItem = z.infer<typeof BookingDashboardItemSchema>;
