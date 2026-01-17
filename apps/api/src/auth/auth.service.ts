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

/**
 * AuthService
 *
 * Gère l'authentification : inscription, login, validation JWT
 *
 * RÈGLES MÉTIER PHASE 7A :
 * - Un seul `phone` à l'inscription
 * - Si PRO : phone copié automatiquement vers ProProfile.whatsapp
 * - Login hybride : email OU phone
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * REGISTER
   * Inscription d'un nouveau Client ou Pro
   *
   * RÈGLE MÉTIER :
   * - Si role === 'PRO', créer ProProfile avec whatsapp = phone (copie auto)
   */
  async register(dto: RegisterInput) {
    // 1. Vérifier unicité email
    if (dto.email) {
      const existingEmail = await this.prisma.query(
        'SELECT id FROM "User" WHERE email = $1',
        [dto.email],
      );
      if (existingEmail.rows.length > 0) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    // 2. Vérifier unicité phone
    const existingPhone = await this.prisma.query(
      'SELECT id FROM "User" WHERE phone = $1',
      [dto.phone],
    );
    if (existingPhone.rows.length > 0) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }

    // 3. Vérifier que cityId existe (si PRO)
    if (dto.role === 'PRO') {
      if (!dto.cityId) {
        throw new BadRequestException('La ville est obligatoire pour les Professionnels');
      }

      const cityExists = await this.prisma.query(
        'SELECT id FROM "City" WHERE id = $1',
        [dto.cityId],
      );
      if (cityExists.rows.length === 0) {
        throw new BadRequestException('Ville invalide');
      }
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 5. Transaction : Créer User + ProProfile si PRO
    try {
      // Créer le User
      const userResult = await this.prisma.query(
        `INSERT INTO "User" (id, role, phone, email, password, "firstName", "lastName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, role, phone, email, "firstName", "lastName", status, "createdAt"`,
        [dto.role, dto.phone, dto.email || null, hashedPassword, dto.firstName, dto.lastName],
      );

      const user = userResult.rows[0];

      // Si PRO : créer ProProfile avec whatsapp = phone (COPIE AUTO)
      if (dto.role === 'PRO' && dto.cityId) {
        await this.prisma.query(
          `INSERT INTO "ProProfile" ("userId", "cityId", whatsapp, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [user.id, dto.cityId, dto.phone], // ⚠️ phone copié vers whatsapp
        );
      }

      // 6. Générer JWT
      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      // 7. Retourner réponse
      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new BadRequestException('Erreur lors de l\'inscription');
    }
  }

  /**
   * LOGIN
   * Connexion avec email OU phone + password
   *
   * RÈGLE MÉTIER : Login hybride
   */
  async login(dto: LoginInput) {
    // 1. Chercher user par email OU phone
    const userResult = await this.prisma.query(
      `SELECT id, role, phone, email, password, "firstName", "lastName", status, "createdAt"
       FROM "User"
       WHERE email = $1 OR phone = $1`,
      [dto.login],
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const user = userResult.rows[0];

    // 2. Vérifier password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // 3. Vérifier statut utilisateur
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Compte suspendu ou banni');
    }

    // 4. Générer JWT
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. Retourner réponse
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * VALIDATE USER
   * Utilisé par JwtStrategy pour valider le token
   */
  async validateUser(userId: string): Promise<PublicUser | null> {
    const userResult = await this.prisma.query(
      `SELECT id, email, "firstName", "lastName", role, status, "createdAt"
       FROM "User"
       WHERE id = $1 AND status = 'ACTIVE'`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
