import { z } from 'zod';

/**
 * SubmitKycDto
 * Soumission du dossier KYC par le PRO
 *
 * Validation :
 * - cinNumber : Normalisé (trim + uppercase)
 * - frontKey : Storage key de la photo CIN recto
 * - backKey : Storage key de la photo CIN verso
 */
export const SubmitKycSchema = z.object({
  cinNumber: z.string().min(1, 'Le numéro CIN est requis').transform((val) => val.trim().toUpperCase()),
  frontKey: z.string().min(1, 'La clé de la photo recto est requise'),
  backKey: z.string().min(1, 'La clé de la photo verso est requise'),
});

export type SubmitKycDto = z.infer<typeof SubmitKycSchema>;

/**
 * UploadResponseDto
 * Réponse après upload d'une image (ne retourne que la key, pas d'URL publique)
 */
export interface UploadResponseDto {
  key: string;     // Storage key (private, never a public URL)
  filename: string; // Nom du fichier généré (UUID)
}
