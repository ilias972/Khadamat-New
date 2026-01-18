import { Injectable, NotFoundException } from '@nestjs/common';
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

    // Mettre à jour le profil
    const updatedProfile = await this.prisma.proProfile.update({
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

    return updatedProfile;
  }

  /**
   * updateServices
   *
   * Met à jour les services proposés par le PRO.
   * Stratégie UPSERT : Pour chaque service, on fait un upsert basé sur [proUserId, categoryId].
   *
   * @param userId - ID de l'utilisateur PRO
   * @param dto - Array de services à upsert
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

    // Vérifier que toutes les catégories existent
    const categoryIds = dto.map((s) => s.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('Une ou plusieurs catégories sont invalides');
    }

    // UPSERT chaque service
    const upsertPromises = dto.map((service) =>
      this.prisma.proService.upsert({
        where: {
          proUserId_categoryId: {
            proUserId: userId,
            categoryId: service.categoryId,
          },
        },
        update: {
          pricingType: service.pricingType,
          fixedPriceMad: service.fixedPriceMad ?? null,
          minPriceMad: service.minPriceMad ?? null,
          maxPriceMad: service.maxPriceMad ?? null,
          isActive: service.isActive,
        },
        create: {
          proUserId: userId,
          categoryId: service.categoryId,
          pricingType: service.pricingType,
          fixedPriceMad: service.fixedPriceMad ?? null,
          minPriceMad: service.minPriceMad ?? null,
          maxPriceMad: service.maxPriceMad ?? null,
          isActive: service.isActive,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    );

    await Promise.all(upsertPromises);

    // Retourner la liste complète des services du PRO
    const allServices = await this.prisma.proService.findMany({
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

    return allServices;
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
