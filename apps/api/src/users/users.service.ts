import { Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsUUID, Length, Matches } from 'class-validator';
import { PrismaService } from '../database/prisma.service';

export class UpdateProfileDto {
  @IsOptional()
  @IsUUID('4')
  cityId?: string;

  @IsOptional()
  @Length(2, 50)
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
  firstName?: string;

  @IsOptional()
  @Length(2, 50)
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
  lastName?: string;

  @IsOptional()
  @Length(5, 200)
  addressLine?: string;
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
        city: {
          select: {
            id: true,
            name: true,
          },
        },
        proProfile: {
          select: {
            userId: true,
            isPremium: true,
          },
        },
      },
    });
  }
}
