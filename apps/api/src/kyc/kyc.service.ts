import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { SubmitKycDto } from './kyc.dto';

/**
 * KycService
 *
 * Service pour gérer le processus KYC (Know Your Customer) des professionnels.
 * Gère la soumission du dossier KYC avec CIN et photos.
 */
@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  /**
   * submitKyc
   *
   * Soumet le dossier KYC d'un professionnel.
   *
   * Validation :
   * - Vérifie que le PRO a un profil
   * - Normalise le cinNumber (trim + uppercase)
   * - Gère l'unicité du CIN (erreur P2002)
   * - Met à jour kycStatus à PENDING
   *
   * @param userId - ID du PRO connecté
   * @param dto - { cinNumber, frontUrl, backUrl }
   * @returns ProProfile mis à jour
   */
  async submitKyc(userId: string, dto: SubmitKycDto) {
    // 1. Vérifier que le profil PRO existe
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // 2. Normaliser le cinNumber (déjà fait par zod transform, mais on sécurise)
    const normalizedCinNumber = dto.cinNumber.trim().toUpperCase();

    // 3. Mettre à jour le profil avec gestion d'erreur d'unicité
    try {
      const updatedProfile = await this.prisma.proProfile.update({
        where: { userId },
        data: {
          cinNumber: normalizedCinNumber,
          kycCinFrontUrl: dto.frontUrl,
          kycCinBackUrl: dto.backUrl,
          kycStatus: 'PENDING', // Passe en attente de validation
          kycRejectionReason: null, // Reset le motif de rejet si c'était un resoumission
        },
        select: {
          userId: true,
          cinNumber: true,
          kycStatus: true,
          kycCinFrontUrl: true,
          kycCinBackUrl: true,
        },
      });

      return updatedProfile;
    } catch (error: any) {
      // Gestion de l'erreur d'unicité Prisma (P2002)
      if (error.code === 'P2002' && error.meta?.target?.includes('cinNumber')) {
        throw new ConflictException('Ce numéro CIN est déjà utilisé par un autre professionnel');
      }
      throw error; // Relancer les autres erreurs
    }
  }

  /**
   * getMyKycStatus
   *
   * Récupère le statut KYC du PRO connecté.
   *
   * @param userId - ID du PRO connecté
   * @returns { kycStatus, kycRejectionReason }
   */
  async getMyKycStatus(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: {
        kycStatus: true,
        kycRejectionReason: true,
        cinNumber: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    return {
      kycStatus: profile.kycStatus,
      kycRejectionReason: profile.kycRejectionReason,
      hasCinNumber: !!profile.cinNumber,
    };
  }
}
