import { z } from 'zod';

/**
 * SubmitKycDto
 * Soumission du dossier KYC par le PRO
 *
 * Validation :
 * - cinNumber : Normalisé (trim + uppercase)
 * - frontUrl : URL publique de la photo CIN recto
 * - backUrl : URL publique de la photo CIN verso
 */
export const SubmitKycSchema = z.object({
  cinNumber: z.string().min(1, 'Le numéro CIN est requis').transform((val) => val.trim().toUpperCase()),
  frontUrl: z.string().url('URL de la photo recto invalide'),
  backUrl: z.string().url('URL de la photo verso invalide'),
});

export type SubmitKycDto = z.infer<typeof SubmitKycSchema>;

/**
 * UploadResponseDto
 * Réponse après upload d'une image
 */
export interface UploadResponseDto {
  url: string; // URL publique du fichier uploadé
  filename: string; // Nom du fichier généré (UUID)
}
