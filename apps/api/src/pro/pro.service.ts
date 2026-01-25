import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  UpdateProProfileInput,
  UpdateServicesInput,
  UpdateAvailabilityInput,
} from '@khadamat/contracts';

/**
 * ProService
 *
 * Service pour la gestion du profil et de la configuration des Professionnels.
 * Toutes les méthodes requièrent que l'utilisateur soit authentifié et ait le rôle PRO.
 */
@Injectable()
export class ProService {
  constructor(private prisma: PrismaService) {}

  /**
   * getMyDashboard
   *
   * Récupère toutes les informations du dashboard du PRO :
   * - user : Informations utilisateur de base
   * - profile : Profil Pro (ville, whatsapp, KYC, etc.)
   * - services : Liste des services proposés
   * - availability : Disponibilités hebdomadaires
   *
   * @param userId - ID de l'utilisateur PRO
   * @returns Dashboard complet du PRO
   */
  async getMyDashboard(userId: string) {
    // Vérifier que le profil PRO existe
    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            status: true,
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        services: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        weeklyAvailability: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });

    if (!proProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    return {
      user: proProfile.user,
      profile: {
        userId: proProfile.userId,
        cityId: proProfile.cityId,
        city: proProfile.city,
        whatsapp: proProfile.whatsapp,
        kycStatus: proProfile.kycStatus,
        isPremium: proProfile.isPremium,
        premiumActiveUntil: proProfile.premiumActiveUntil,
        boostActiveUntil: proProfile.boostActiveUntil,
        createdAt: proProfile.createdAt,
        updatedAt: proProfile.updatedAt,
      },
      services: proProfile.services,
      availability: proProfile.weeklyAvailability,
    };
  }

  /**
   * updateProfile
   *
   * Met à jour le profil du PRO (WhatsApp, ville).
   *
   * IMPORTANT: cityId est mis à jour sur DEUX tables simultanément :
   * - User.cityId (source de vérité pour l'affichage)
   * - ProProfile.cityId (nécessaire pour le filtrage de recherche)
   *
   * @param userId - ID de l'utilisateur PRO
   * @param dto - Données de mise à jour
   * @returns Profil Pro mis à jour
   */
  async updateProfile(userId: string, dto: UpdateProProfileInput) {
    // Vérifier que le profil existe
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // Vérifier que la ville existe si cityId est fourni
    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: dto.cityId },
      });
      if (!city) {
        throw new NotFoundException(`Ville avec ID ${dto.cityId} non trouvée`);
      }
    }

    // Transaction : Mettre à jour User.cityId ET ProProfile.cityId simultanément
    const updatedProfile = await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour User.cityId (source de vérité)
      if (dto.cityId) {
        await tx.user.update({
          where: { id: userId },
          data: { cityId: dto.cityId },
        });
      }

      // 2. Mettre à jour ProProfile (whatsapp + cityId pour le filtrage)
      return tx.proProfile.update({
        where: { userId },
        data: {
          whatsapp: dto.whatsapp,
          ...(dto.cityId ? { cityId: dto.cityId } : {}),
        },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    return updatedProfile;
  }

  /**
   * updateServices
   *
   * Met à jour les services proposés par le PRO.
   * Stratégie REPLACE ALL : Supprime tous les services existants et recrée les nouveaux.
   *
   * @param userId - ID de l'utilisateur PRO
   * @param dto - Array de services à créer
   * @returns Liste complète des services mis à jour
   */
  async updateServices(userId: string, dto: UpdateServicesInput) {
    // Vérifier que le profil existe
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // Extraire et dédupliquer les categoryIds
    const categoryIds = [...new Set(dto.map((s) => s.categoryId))];

    // RÈGLE MÉTIER : Limiter les comptes gratuits à 1 service maximum
    if (!existingProfile.isPremium && categoryIds.length > 1) {
      throw new BadRequestException(
        'Les comptes gratuits sont limités à 1 service. Passez Premium pour en ajouter davantage.',
      );
    }

    // Vérifier que toutes les catégories existent
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('Une ou plusieurs catégories sont invalides');
    }

    // Transaction : DELETE ALL + CREATE
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Supprimer tous les services existants
      await tx.proService.deleteMany({
        where: { proUserId: userId },
      });

      // 2. Créer les nouveaux services
      if (dto.length > 0) {
        await tx.proService.createMany({
          data: dto.map((service) => ({
            proUserId: userId,
            categoryId: service.categoryId,
            pricingType: service.pricingType,
            fixedPriceMad: service.fixedPriceMad ?? null,
            minPriceMad: service.minPriceMad ?? null,
            maxPriceMad: service.maxPriceMad ?? null,
            isActive: service.isActive,
          })),
        });
      }

      // 3. Refetch pour confirmer la persistance (self-check)
      const updatedServices = await tx.proService.findMany({
        where: { proUserId: userId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return updatedServices;
    });

    return result;
  }

  /**
   * updateAvailability
   *
   * Met à jour les disponibilités hebdomadaires du PRO.
   * Stratégie REPLACE ALL : Supprime toutes les disponibilités existantes et recrée les nouvelles.
   *
   * @param userId - ID de l'utilisateur PRO
   * @param dto - Array de créneaux de disponibilité
   * @returns Nouvelles disponibilités créées
   */
  async updateAvailability(userId: string, dto: UpdateAvailabilityInput) {
    // Vérifier que le profil existe
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // Transaction : DELETE ALL + CREATE MANY
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Supprimer toutes les disponibilités existantes
      await tx.weeklyAvailability.deleteMany({
        where: { proUserId: userId },
      });

      // 2. Créer les nouvelles disponibilités
      if (dto.length > 0) {
        await tx.weeklyAvailability.createMany({
          data: dto.map((slot) => ({
            proUserId: userId,
            dayOfWeek: slot.dayOfWeek,
            startMin: slot.startMin,
            endMin: slot.endMin,
            isActive: slot.isActive,
          })),
        });
      }

      // 3. Récupérer les nouvelles disponibilités
      const newAvailability = await tx.weeklyAvailability.findMany({
        where: { proUserId: userId },
        orderBy: {
          dayOfWeek: 'asc',
        },
      });

      return newAvailability;
    });

    return result;
  }
}
