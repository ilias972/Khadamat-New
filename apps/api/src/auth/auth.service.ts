import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import type { RegisterInput, LoginInput, PublicUser } from '@khadamat/contracts';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * REGISTER
   * Inscription d'un nouvel utilisateur
   */
  async register(dto: RegisterInput) {
    // 1. Vérifier si l'email existe déjà
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé.');
      }
    }

    // 2. Vérifier si le téléphone existe déjà
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé.');
    }

    // 3. Vérifier la ville si c'est un PRO
    if (dto.role === 'PRO') {
      if (!dto.cityId) {
        throw new BadRequestException('La ville est obligatoire pour un professionnel.');
      }
      const cityExists = await this.prisma.city.findUnique({
        where: { id: dto.cityId },
      });
      if (!cityExists) {
        throw new BadRequestException('Ville invalide.');
      }
    }

    // 4. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 5. Transaction : Créer User + (Optionnel) ProProfile
    const user = await this.prisma.$transaction(async (tx) => {
      // A. Créer le User
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          status: 'ACTIVE',
        },
      });

      // B. Si PRO, créer le profil et COPIER le phone vers whatsapp
      if (dto.role === 'PRO' && dto.cityId) {
        await tx.proProfile.create({
          data: {
            userId: newUser.id,
            cityId: dto.cityId,
            whatsapp: dto.phone, // 👈 Copie automatique !
            bio: '',
            experienceYears: 0,
            radiusKm: 10,
            kycStatus: 'PENDING',
          },
        });
      }

      return newUser;
    });

    // 6. Générer le token directement (Auto-login)
    return this.loginAfterRegister(user);
  }

  /**
   * LOGIN
   * Connexion avec Email OU Téléphone
   */
  async login(dto: LoginInput) {
    // 1. Chercher par Email OU Phone
    // Prisma ne supporte pas nativement "OR" sur findUnique directement,
    // on utilise findFirst avec OR.
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.login },
          { phone: dto.login },
        ],
      },
    });

    // 2. Vérifier User et Password
    if (!user || !user.password) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    // 3. Générer le Token
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    // 4. Préparer l'objet User public
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email || '',
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'CLIENT' | 'PRO' | 'ADMIN',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: publicUser,
    };
  }

  /**
   * Helper interne pour connecter après inscription
   */
  private async loginAfterRegister(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email || '',
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'CLIENT' | 'PRO' | 'ADMIN',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: publicUser,
    };
  }

  /**
   * VALIDATE USER
   * Utilisé par la stratégie JWT
   */
  async validateUser(userId: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email || '',
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'CLIENT' | 'PRO' | 'ADMIN',
    };
  }
}
