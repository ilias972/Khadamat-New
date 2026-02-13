import { z } from 'zod';

const CITY_ID_REGEX = /^city_[a-z]+_\d{3}$/;
const CATEGORY_ID_REGEX = /^cat_[a-z]+_\d{3}$/;

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
  id: z.string().regex(CITY_ID_REGEX, 'cityId invalide'),
  name: z.string(),
  slug: z.string(),
});

export type PublicCity = z.infer<typeof PublicCitySchema>;

/**
 * PublicCategorySchema
 * Représente une catégorie de service disponible
 */
export const PublicCategorySchema = z.object({
  id: z.string().regex(CATEGORY_ID_REGEX, 'categoryId invalide'),
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
  categoryId: z.string().regex(CATEGORY_ID_REGEX, 'categoryId invalide'), // ID public pour le booking
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
  lastName: z.string(),
  phone: z.string().optional(),
  city: z.string(),
  isVerified: z.boolean(),
  services: z.array(PublicServiceSchema),
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  isPremium: z.boolean().optional(),
  ratingAvg: z.number().nullable().optional(),
  ratingCount: z.number().optional(),
  completedBookingsCount: z.number().optional(),
  lastReviews: z.array(z.object({
    rating: z.number(),
    comment: z.string().nullable(),
    createdAt: z.string().or(z.date()),
  })).optional(),
  portfolio: z.array(z.object({
    url: z.string(),
  })).optional(),
});

export type PublicProProfile = z.infer<typeof PublicProProfileSchema>;

/**
 * PublicProsListQuerySchema
 * Query params pour la recherche de Pros
 */
export const PublicProsListQuerySchema = z.object({
  cityId: z.string().regex(CITY_ID_REGEX, 'cityId invalide').optional(),
  categoryId: z.string().regex(CATEGORY_ID_REGEX, 'categoryId invalide').optional(),
});

export type PublicProsListQuery = z.infer<typeof PublicProsListQuerySchema>;
