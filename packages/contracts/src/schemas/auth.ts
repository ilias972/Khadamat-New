import { z } from 'zod';
import { RoleSchema } from '../enums';

// ============================================================================
// AUTH SCHEMAS - PHASE 7A
// ============================================================================

/**
 * LoginSchema
 * Login hybride : accepte email OU phone
 */
export const LoginSchema = z.object({
  login: z.string(), // email OU phone (permissif MVP)
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * RegisterSchema
 * Inscription unifiée pour CLIENT et PRO
 *
 * RÈGLE MÉTIER :
 * - Un seul champ `phone` à l'inscription
 * - Si role === 'PRO', ce phone sera automatiquement copié vers ProProfile.whatsapp
 * - cityId est OBLIGATOIRE pour TOUS (CLIENT et PRO)
 * - addressLine est OBLIGATOIRE si role === 'CLIENT'
 * - cinNumber est OBLIGATOIRE si role === 'PRO' (KYC atomique)
 */
export const RegisterSchema = z
  .object({
    email: z.string().email('Email invalide'),
    phone: z.string().min(10, 'Téléphone invalide'),
    password: z.string().min(6, 'Mot de passe minimum 6 caractères'),
    firstName: z.string().min(1, 'Prénom requis'),
    lastName: z.string().min(1, 'Nom requis'),
    role: RoleSchema.exclude(['ADMIN']), // CLIENT ou PRO uniquement
    cityId: z.string().min(1, 'La ville est obligatoire'), // Requis pour TOUS
    addressLine: z.string().optional(), // Requis si CLIENT, validé dans refine
    cinNumber: z.string().optional(), // Requis si PRO, validé dans refine
  })
  .refine(
    (data) => {
      // Si role === CLIENT, addressLine est obligatoire
      if (data.role === 'CLIENT') {
        return !!data.addressLine && data.addressLine.trim().length > 0;
      }
      return true;
    },
    {
      message: 'L\'adresse est obligatoire pour les clients',
      path: ['addressLine'],
    },
  )
  .refine(
    (data) => {
      // Si role === PRO, cinNumber est obligatoire (KYC atomique)
      if (data.role === 'PRO') {
        return !!data.cinNumber && data.cinNumber.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Le numéro CIN est obligatoire pour les professionnels',
      path: ['cinNumber'],
    },
  );

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * PublicUserSchema
 * Représente l'utilisateur connecté (retourné par /me et /login)
 */
export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(), // Peut être null (si inscrit par tel)
  phone: z.string(),                       // ✅ AJOUTÉ : Le téléphone est visible pour soi-même
  firstName: z.string(),
  lastName: z.string(),
  role: RoleSchema,
  status: z.string().optional(),
  createdAt: z.string().optional(),
  // Phase 10 V4-B: Hydratation complète
  cityId: z.string().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  city: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  isPremium: z.boolean().optional(), // Pour les PRO
  kycStatus: z.enum(['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED']).optional(), // Pour les PRO
});

export type PublicUser = z.infer<typeof PublicUserSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: PublicUserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
