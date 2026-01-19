import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface UpdateProfileDto {
  cityId?: string;
  addressLine?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const dataToUpdate: any = {};
    if (dto.cityId !== undefined) dataToUpdate.cityId = dto.cityId;
    if (dto.addressLine !== undefined) dataToUpdate.addressLine = dto.addressLine.trim();
    if (dto.firstName !== undefined) dataToUpdate.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) dataToUpdate.lastName = dto.lastName.trim();

    return this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        cityId: true,
        addressLine: true,
      },
    });
  }
}
