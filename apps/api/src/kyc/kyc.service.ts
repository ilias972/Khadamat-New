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
   * resubmitKyc
   *
   * Re-soumet le dossier KYC après rejet (REJECTED → PENDING).
   *
   * - Accessible uniquement si kycStatus === 'REJECTED'
   * - Met à jour cinNumber et/ou fichiers si fournis
   * - Repasse le statut à PENDING
   * - Efface le motif de rejet
   *
   * @param userId - ID du PRO connecté
   * @param dto - { cinNumber?, frontUrl?, backUrl? }
   * @returns ProProfile mis à jour
   */
  async resubmitKyc(
    userId: string,
    dto: { cinNumber?: string; frontUrl?: string; backUrl?: string },
  ) {
    // 1. Vérifier que le profil existe
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: {
        kycStatus: true,
        cinNumber: true,
        kycCinFrontUrl: true,
        kycCinBackUrl: true,
      },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // 2. Vérifier que le statut est REJECTED
    if (existingProfile.kycStatus !== 'REJECTED') {
      throw new BadRequestException(
        'La re-soumission est autorisée uniquement si le dossier a été rejeté',
      );
    }

    // 3. Préparer les données de mise à jour
    const updateData: any = {
      kycStatus: 'PENDING', // Repasser à PENDING
      kycRejectionReason: null, // Effacer le motif de rejet
    };

    // Mettre à jour cinNumber si fourni
    if (dto.cinNumber) {
      const normalizedCinNumber = dto.cinNumber.trim().toUpperCase();

      // Vérifier l'unicité si changement de numéro
      if (normalizedCinNumber !== existingProfile.cinNumber) {
        const existingCin = await this.prisma.proProfile.findUnique({
          where: { cinNumber: normalizedCinNumber },
        });
        if (existingCin) {
          throw new ConflictException('Ce numéro CIN est déjà utilisé par un autre professionnel');
        }
      }

      updateData.cinNumber = normalizedCinNumber;
    }

    // Mettre à jour les URLs si fournies
    if (dto.frontUrl) {
      updateData.kycCinFrontUrl = dto.frontUrl;
    }
    if (dto.backUrl) {
      updateData.kycCinBackUrl = dto.backUrl;
    }

    // 4. Mettre à jour le profil
    try {
      const updatedProfile = await this.prisma.proProfile.update({
        where: { userId },
        data: updateData,
        select: {
          userId: true,
          cinNumber: true,
          kycStatus: true,
          kycCinFrontUrl: true,
          kycCinBackUrl: true,
          kycRejectionReason: true,
        },
      });

      return updatedProfile;
    } catch (error: any) {
      // Gestion de l'erreur d'unicité Prisma (P2002)
      if (error.code === 'P2002' && error.meta?.target?.includes('cinNumber')) {
        throw new ConflictException('Ce numéro CIN est déjà utilisé par un autre professionnel');
      }
      throw error;
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
