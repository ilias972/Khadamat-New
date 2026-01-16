import { z } from 'zod';

/**
 * Create Booking Schema
 * PRD Section 10: Client crée une réservation avec un PRO
 * timeSlot: ISO datetime string (ex: 2026-01-16T14:00:00.000Z)
 * Pas de validation stricte (permissif MVP)
 */
export const CreateBookingSchema = z.object({
  proId: z.string(),
  cityId: z.string(),
  categoryId: z.string(),
  timeSlot: z.string(),
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
