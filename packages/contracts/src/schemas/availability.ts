import { z } from 'zod';

/**
 * Weekly Availability Schema
 * PRD Section 9: Horaires hebdomadaires
 * Prisma: dayOfWeek (0=Dimanche … 6=Samedi), startMin/endMin (minutes depuis 00:00)
 * Pas de validation min/max (permissif MVP)
 */
export const WeeklyAvailabilitySchema = z.object({
  dayOfWeek: z.number(),
  startMin: z.number(),
  endMin: z.number(),
  isActive: z.boolean(),
});
export type WeeklyAvailabilityInput = z.infer<
  typeof WeeklyAvailabilitySchema
>;
