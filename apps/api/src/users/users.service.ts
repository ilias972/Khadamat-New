import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * UpdateProfileDto
 * Données modifiables pour le profil utilisateur
 * Champs autorisés : cityId, addressLine, firstName, lastName
 */
export interface UpdateProfileDto {
  cityId?: string;
  addressLine?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * UsersService
 * Service pour la gestion du profil utilisateur
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * updateProfile
   * Met à jour le profil de l'utilisateur connecté
   *
   * @param userId - ID de l'utilisateur connecté
   * @param dto - Données à mettre à jour (cityId, addressLine, firstName, lastName)
   * @returns Profil mis à jour
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Construire l'objet de mise à jour (uniquement les champs fournis)
    const dataToUpdate: {
      cityId?: string;
      addressLine?: string;
      firstName?: string;
      lastName?: string;
    } = {};

    if (dto.cityId !== undefined) {
      dataToUpdate.cityId = dto.cityId;
    }
    if (dto.addressLine !== undefined) {
      dataToUpdate.addressLine = dto.addressLine.trim();
    }
    if (dto.firstName !== undefined) {
      dataToUpdate.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined) {
      dataToUpdate.lastName = dto.lastName.trim();
    }

    // Mettre à jour le profil
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cityId: true,
        addressLine: true,
        role: true,
        status: true,
      },
    });

    return updatedUser;
  }
}
