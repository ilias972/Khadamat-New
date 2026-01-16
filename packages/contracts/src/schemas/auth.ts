import { z } from 'zod';

/**
 * Login Schema
 * PRD: "Téléphone ou email + mot de passe"
 * login accepte les deux formats (permissif MVP)
 */
export const LoginSchema = z.object({
  login: z.string(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Register Client Schema
 * PRD Section 5: Téléphone, Email, Mot de passe, Nom / Prénom, Rôle
 * Prisma: email est optionnel (String?)
 */
export const RegisterClientSchema = z.object({
  phone: z.string(),
  email: z.string().optional(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});
export type RegisterClientInput = z.infer<typeof RegisterClientSchema>;

/**
 * Register Pro Schema
 * Hérite de RegisterClient + ProProfile (cityId, whatsapp)
 * PRD Section 4: PRO choisit 1 seule ville
 */
export const RegisterProSchema = RegisterClientSchema.extend({
  cityId: z.string(),
  whatsapp: z.string(),
});
export type RegisterProInput = z.infer<typeof RegisterProSchema>;
