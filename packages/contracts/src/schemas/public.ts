import { z } from 'zod';

// ============================================================================
// PUBLIC SCHEMAS - MARKETPLACE DISCOVERY
// ============================================================================
// RÈGLE CRITIQUE : Ces schemas ne doivent JAMAIS exposer de données sensibles
// (email, phone, whatsapp, password)
// ============================================================================

/**
 * PublicCitySchema
 * Représente une ville disponible sur la plateforme
 */
export const PublicCitySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type PublicCity = z.infer<typeof PublicCitySchema>;

/**
 * PublicCategorySchema
 * Représente une catégorie de service disponible
 */
export const PublicCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type PublicCategory = z.infer<typeof PublicCategorySchema>;

/**
 * PublicServiceSchema
 * Représente un service proposé par un Pro avec prix formaté
 */
export const PublicServiceSchema = z.object({
  name: z.string(),
  priceFormatted: z.string(), // "200 MAD" ou "De 200 à 500 MAD"
});

export type PublicService = z.infer<typeof PublicServiceSchema>;

/**
 * PublicProCardSchema
 * Représente un Pro dans la liste de recherche (format card)
 * Nom masqué pour privacy (ex: "Ahmed B.")
 */
export const PublicProCardSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(), // Format masqué : "B." ou "" si pas de lastName
  city: z.string(), // Nom de la ville (pas l'ID)
  isVerified: z.boolean(), // true si kycStatus === 'APPROVED'
  services: z.array(PublicServiceSchema), // Liste des services principaux
});

export type PublicProCard = z.infer<typeof PublicProCardSchema>;

/**
 * PublicProProfileSchema
 * Représente le profil détaillé d'un Pro (page détail)
 * Inclut tous les champs de la card + informations supplémentaires
 */
export const PublicProProfileSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(), // Format masqué : "B." ou "" si pas de lastName
  city: z.string(), // Nom de la ville
  isVerified: z.boolean(), // true si kycStatus === 'APPROVED'
  services: z.array(PublicServiceSchema), // Liste complète des services
  bio: z.string().optional(), // Pas encore implémenté dans le schéma, préparé pour le futur
});

export type PublicProProfile = z.infer<typeof PublicProProfileSchema>;

/**
 * PublicProsListQuerySchema
 * Query params pour la recherche de Pros
 */
export const PublicProsListQuerySchema = z.object({
  cityId: z.string().optional(),
  categoryId: z.string().optional(),
});

export type PublicProsListQuery = z.infer<typeof PublicProsListQuerySchema>;
