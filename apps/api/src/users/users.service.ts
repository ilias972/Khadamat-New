import { Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { validateUrl } from '../common/utils/url-validation';

const CITY_ID_REGEX = /^(city_[a-z0-9]+_\d{3}|c[a-z0-9]{24,})$/i;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Matches(CITY_ID_REGEX, { message: 'cityId invalide' })
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

  @IsOptional()
  avatarUrl?: string | null;
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
    if (dto.cityId !== undefined) {
      const cityInput = dto.cityId.trim();
      const city = await this.prisma.city.findFirst({
        where: {
          OR: [{ publicId: cityInput }, { id: cityInput }],
        },
        select: { id: true },
      });

      if (!city) {
        throw new NotFoundException('Ville introuvable');
      }

      dataToUpdate.cityId = city.id;
    }
    if (dto.addressLine !== undefined) dataToUpdate.addressLine = dto.addressLine.trim();
    if (dto.firstName !== undefined) dataToUpdate.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) dataToUpdate.lastName = dto.lastName.trim();
    if (dto.avatarUrl !== undefined) {
      if (dto.avatarUrl === null || dto.avatarUrl.trim() === '') {
        dataToUpdate.avatarUrl = null;
      } else {
        dataToUpdate.avatarUrl = validateUrl(dto.avatarUrl);
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        publicId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        addressLine: true,
        avatarUrl: true,
        city: {
          select: {
            publicId: true,
            name: true,
          },
        },
        proProfile: {
          select: {
            publicId: true,
            isPremium: true,
          },
        },
      },
    });

    return {
      id: updatedUser.publicId,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      cityId: updatedUser.city?.publicId ?? null,
      addressLine: updatedUser.addressLine,
      avatarUrl: updatedUser.avatarUrl,
      city: updatedUser.city
        ? {
            id: updatedUser.city.publicId,
            name: updatedUser.city.name,
          }
        : null,
      isPremium: updatedUser.proProfile?.isPremium ?? false,
    };
  }
}
