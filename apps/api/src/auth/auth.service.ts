import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import type { RegisterInput, LoginInput, PublicUser } from '@khadamat/contracts';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * REGISTER ATOMIQUE
   * Inscription d'un nouvel utilisateur avec upload de fichiers (PRO)
   *
   * HARD GATE :
   * - Si PRO : cinNumber + fichiers OBLIGATOIRES, statut PENDING
   * - Si CLIENT : fichiers ignorés
   * - Transaction atomique : Si upload échoue, compte non créé
   */
  async register(
    dto: RegisterInput,
    cinFrontFile?: Express.Multer.File,
    cinBackFile?: Express.Multer.File,
  ) {
    // 0. Normalisation des entrées
    const email = dto.email?.toLowerCase().trim();
    const phone = dto.phone.trim();

    // 1. Vérifier si l'email existe déjà (si fourni)
    if (email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: email },
      });
      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé.');
      }
    }

    // 2. Vérifier si le téléphone existe déjà
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: phone },
    });
    if (existingPhone) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé.');
    }

    // 3. Vérifier la ville (obligatoire pour TOUS)
    if (!dto.cityId) {
      throw new BadRequestException('La ville est obligatoire.');
    }
    const cityExists = await this.prisma.city.findUnique({
      where: { id: dto.cityId },
    });
    if (!cityExists) {
      throw new BadRequestException('Ville invalide.');
    }

    // 4. Vérifier l'adresse si c'est un CLIENT
    if (dto.role === 'CLIENT') {
      if (!dto.addressLine || dto.addressLine.trim().length === 0) {
        throw new BadRequestException("L'adresse est obligatoire pour un client.");
      }
    }

    // 5. Vérifier l'unicité du CIN si PRO
    if (dto.role === 'PRO' && dto.cinNumber) {
      const normalizedCinNumber = dto.cinNumber.trim().toUpperCase();
      const existingCin = await this.prisma.proProfile.findUnique({
        where: { cinNumber: normalizedCinNumber },
      });
      if (existingCin) {
        throw new ConflictException('Ce numéro CIN est déjà utilisé.');
      }
    }

    // 6. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 7. Générer les URLs publiques pour les fichiers (si PRO)
    const baseUrl = this.config.get<string>('PUBLIC_URL') || 'http://localhost:3001';
    const frontUrl = cinFrontFile ? `${baseUrl}/uploads/kyc/${cinFrontFile.filename}` : null;
    const backUrl = cinBackFile ? `${baseUrl}/uploads/kyc/${cinBackFile.filename}` : null;

    // 8. Transaction atomique : Créer User + ProProfile
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // A. Créer le User avec cityId et addressLine
        const newUser = await tx.user.create({
          data: {
            email: email,
            phone: phone,
            password: hashedPassword,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: dto.role,
            status: 'ACTIVE',
            cityId: dto.cityId,
            addressLine: dto.addressLine?.trim() || null,
          },
        });

        // B. Si PRO, créer le profil avec KYC PENDING
        if (dto.role === 'PRO') {
          await tx.proProfile.create({
            data: {
              userId: newUser.id,
              cityId: dto.cityId,
              whatsapp: phone, // Copie automatique
              cinNumber: dto.cinNumber?.trim().toUpperCase() || null,
              kycCinFrontUrl: frontUrl,
              kycCinBackUrl: backUrl,
              kycStatus: 'PENDING', // HARD GATE : PENDING dès l'inscription
            },
          });
        }

        return newUser;
      });

      // 9. Générer le token directement (Auto-login)
      return this.loginAfterRegister(user);
    } catch (error: any) {
      // Rollback : Supprimer les fichiers uploadés si la transaction échoue
      if (cinFrontFile) {
        await fs.unlink(cinFrontFile.path).catch(() => {
          // Ignore si fichier déjà supprimé
        });
      }
      if (cinBackFile) {
        await fs.unlink(cinBackFile.path).catch(() => {
          // Ignore si fichier déjà supprimé
        });
      }

      // Relancer l'erreur
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('cinNumber')) {
          throw new ConflictException('Ce numéro CIN est déjà utilisé');
        }
        throw new ConflictException('Données en conflit');
      }
      throw error;
    }
  }

  /**
   * LOGIN
   * Connexion avec Email OU Téléphone
   */
  async login(dto: LoginInput) {
    if (!dto.login || typeof dto.login !== 'string') {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const loginValue = dto.login.trim();

    // 1. Chercher par Email OU Phone avec relations complètes
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: loginValue.toLowerCase() }, { phone: loginValue }],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        password: true,
        firstName: true,
        lastName: true,
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
            kycStatus: true, // Ajout du kycStatus pour le frontend
          },
        },
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

    // 3. Générer le Token et retourner le user public
    return this.createAuthPayload(user);
  }

  /**
   * Helper interne pour connecter après inscription
   */
  private async loginAfterRegister(user: any) {
    // Recharger le user avec toutes les relations
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
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
            kycStatus: true,
          },
        },
      },
    });

    return this.createAuthPayload(fullUser);
  }

  /**
   * Helper pour construire la réponse Auth (Token + Public User)
   */
  private createAuthPayload(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    // Construction sécurisée du PublicUser (sans password)
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'CLIENT' | 'PRO' | 'ADMIN',
      cityId: user.cityId ?? null,
      addressLine: user.addressLine ?? null,
      city: user.city ? { id: user.city.id, name: user.city.name } : null,
      isPremium: user.proProfile?.isPremium ?? false,
      kycStatus: user.proProfile?.kycStatus ?? undefined, // Ajout du kycStatus
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
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
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
            kycStatus: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'CLIENT' | 'PRO' | 'ADMIN',
      cityId: user.cityId ?? null,
      addressLine: user.addressLine ?? null,
      city: user.city ? { id: user.city.id, name: user.city.name } : null,
      isPremium: user.proProfile?.isPremium ?? false,
      kycStatus: user.proProfile?.kycStatus ?? undefined,
    };
  }
}
