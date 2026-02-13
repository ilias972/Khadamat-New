import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { FailedLoginService } from './failed-login.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import type { RegisterInput, LoginInput, PublicUser } from '@khadamat/contracts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshExpiresMs: number;

  // Rate-limit replay detection : max 1 warn par userId par 60s
  private readonly replayWarnings = new Map<string, number>();
  private static readonly REPLAY_COOLDOWN_MS = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly failedLogin: FailedLoginService,
  ) {
    // Convertir JWT_REFRESH_EXPIRES en ms (défaut 7 jours)
    this.refreshExpiresMs = this.parseDurationToMs(
      this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d',
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════

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
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new ConflictException('Données en conflit');
      }
    }

    // 2. Vérifier si le téléphone existe déjà
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: phone },
    });
    if (existingPhone) {
      throw new ConflictException('Données en conflit');
    }

    // 3. Vérifier la ville (obligatoire pour TOUS)
    if (!dto.cityId) {
      throw new BadRequestException('La ville est obligatoire.');
    }
    const city = await this.prisma.city.findUnique({
      where: { publicId: dto.cityId },
      select: { id: true },
    });
    if (!city) {
      throw new BadRequestException('Ville invalide.');
    }

    // 4. Vérifier l'adresse si c'est un CLIENT
    if (dto.role === 'CLIENT') {
      if (!dto.addressLine || dto.addressLine.trim().length === 0) {
        throw new BadRequestException("L'adresse est obligatoire pour un client.");
      }
    }

    // 5. HARD GATE PRO : Vérifier cinNumber + fichiers OBLIGATOIRES
    if (dto.role === 'PRO') {
      if (!dto.cinNumber?.trim()) {
        throw new BadRequestException('Le numéro CIN est obligatoire pour les professionnels.');
      }
      if (!cinFrontFile || !cinBackFile) {
        throw new BadRequestException('Les photos du CIN (recto et verso) sont obligatoires pour les professionnels.');
      }
    }

    // 6. Vérifier l'unicité du CIN si PRO (via cinHash)
    let cinHash: string | null = null;
    if (dto.role === 'PRO' && dto.cinNumber) {
      cinHash = this.hashCin(dto.cinNumber);
      const existingCin = await this.prisma.proProfile.findFirst({
        where: { cinHash },
      });
      if (existingCin) {
        throw new ConflictException('Données en conflit');
      }
    }

    // 7. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 8. Storage keys pour les fichiers KYC (privé, jamais d'URL publique)
    const frontKey = cinFrontFile ? cinFrontFile.filename : null;
    const backKey = cinBackFile ? cinBackFile.filename : null;

    // 9. Transaction atomique : Créer User + ProProfile
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const userPublicId = `usr_${crypto.randomBytes(16).toString('hex')}`;
        const newUser = await tx.user.create({
          data: {
            publicId: userPublicId,
            email: email,
            phone: phone,
            password: hashedPassword,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: dto.role,
            status: 'ACTIVE',
            cityId: city.id,
            addressLine: dto.addressLine?.trim() || null,
          },
        });

        if (dto.role === 'PRO') {
          const proPublicId = `pro_${crypto.randomBytes(16).toString('hex')}`;
          await tx.proProfile.create({
            data: {
              userId: newUser.id,
              publicId: proPublicId,
              cityId: city.id,
              whatsapp: phone,
              cinHash: cinHash,
              kycCinFrontKey: frontKey,
              kycCinBackKey: backKey,
              kycStatus: 'PENDING',
            },
          });
        }

        return newUser;
      });

      // 10. Auto-login avec dual tokens (cookies only)
      return this.loginAfterRegister(user);
    } catch (error: any) {
      // Rollback : Supprimer les fichiers uploadés si la transaction échoue
      if (cinFrontFile) {
        await fs.unlink(cinFrontFile.path).catch(() => {});
      }
      if (cinBackFile) {
        await fs.unlink(cinBackFile.path).catch(() => {});
      }

      if (error.code === 'P2002') {
        throw new ConflictException('Données en conflit');
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN
  // ═══════════════════════════════════════════════════════════════

  async login(dto: LoginInput) {
    if (!dto.login || typeof dto.login !== 'string') {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const loginValue = dto.login.trim();

    // Check lockout BEFORE any DB query or bcrypt
    const lockSeconds = this.failedLogin.isLocked(loginValue);
    if (lockSeconds > 0) {
      this.logger.warn(`Login attempt blocked: account locked (remaining: ${lockSeconds}s)`);
      throw new UnauthorizedException('Trop de tentatives. Réessayez plus tard.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: loginValue.toLowerCase() }, { phone: loginValue }],
      },
      select: {
        id: true,
        publicId: true,
        email: true,
        phone: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        cityId: true,
        addressLine: true,
        city: { select: { id: true, publicId: true, name: true } },
        proProfile: { select: { userId: true, publicId: true, isPremium: true, kycStatus: true } },
      },
    });

    const DUMMY_HASH = '$2b$10$invalidinvalidinvalidinvalidinval';
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user?.password || DUMMY_HASH,
    );

    if (!user || !isPasswordValid || user.status !== 'ACTIVE') {
      // Record failure using the login identifier
      this.failedLogin.recordFailure(loginValue);
      this.logger.warn(`Failed login attempt for identifier`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Success: reset failed attempts
    this.failedLogin.resetAttempts(loginValue);

    return this.createAuthPayload(user);
  }

  // ═══════════════════════════════════════════════════════════════
  //  REFRESH TOKEN
  // ═══════════════════════════════════════════════════════════════

  /**
   * Échange un refresh token valide contre une nouvelle paire access+refresh.
   * L'ancien refresh token est révoqué (rotation).
   */
  async refreshTokens(rawRefreshToken: string) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            publicId: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            cityId: true,
            addressLine: true,
            city: { select: { id: true, publicId: true, name: true } },
            proProfile: { select: { userId: true, publicId: true, isPremium: true, kycStatus: true } },
          },
        },
      },
    });

    const REFRESH_ERROR = 'Refresh token invalide';

    if (!stored) {
      throw new UnauthorizedException(REFRESH_ERROR);
    }

    // Token déjà révoqué -> possible replay attack
    // Révoquer TOUTE la famille de tokens de cet utilisateur par sécurité
    if (stored.revoked) {
      const lastWarn = this.replayWarnings.get(stored.userId) || 0;
      if (Date.now() - lastWarn > AuthService.REPLAY_COOLDOWN_MS) {
        this.logger.warn(
          `Reuse of revoked refresh token detected for user ${stored.userId}. Revoking all tokens.`,
        );
        this.replayWarnings.set(stored.userId, Date.now());
      }
      await this.revokeAllUserTokens(stored.userId);
      throw new UnauthorizedException(REFRESH_ERROR);
    }

    // Token expiré
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      });
      throw new UnauthorizedException(REFRESH_ERROR);
    }

    // Rotation : révoquer l'ancien, émettre un nouveau couple
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.createAuthPayload(stored.user);
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOGOUT (révocation)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Révoque un refresh token spécifique (déconnexion d'un device).
   */
  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return;
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });

    if (stored) {
      await this.revokeAllUserTokens(stored.userId);
    }
  }

  /**
   * Révoque TOUS les refresh tokens d'un utilisateur (déconnexion globale).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  VALIDATE USER (utilisé par JwtStrategy)
  // ═══════════════════════════════════════════════════════════════

  async validateUser(userId: string): Promise<(PublicUser & { publicId: string }) | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        publicId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        cityId: true,
        addressLine: true,
        avatarUrl: true,
        city: { select: { id: true, publicId: true, name: true } },
        proProfile: { select: { userId: true, publicId: true, isPremium: true, kycStatus: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') return null;

    const publicUser = this.toPublicUser(user);
    // Attach internal DB id so controllers/services can use req.user.id for DB queries,
    // while publicId holds the usr_xxx value for API responses.
    return { ...publicUser, id: user.id, publicId: publicUser.id };
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS INTERNES
  // ═══════════════════════════════════════════════════════════════

  private async loginAfterRegister(user: any) {
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        publicId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        cityId: true,
        addressLine: true,
        avatarUrl: true,
        city: { select: { id: true, publicId: true, name: true } },
        proProfile: { select: { userId: true, publicId: true, isPremium: true, kycStatus: true } },
      },
    });

    return this.createAuthPayload(fullUser);
  }

  /**
   * Génère access token (JWT court) + refresh token (opaque, stocké en DB).
   * Retourne tokens séparément pour que le controller les mette en cookies.
   */
  async createAuthPayload(user: any) {
    const jwtPayload = { sub: user.id };
    const accessToken = this.jwtService.sign(jwtPayload);

    // Refresh token : 64 bytes aléatoires, seul le hash est stocké en DB
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + this.refreshExpiresMs),
      },
    });

    const publicUser = this.toPublicUser(user);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: publicUser,
    };
  }

  private toPublicUser(user: any): PublicUser {
    return {
      id: user.publicId ?? user.id,
      email: user.email ?? null,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'CLIENT' | 'PRO' | 'ADMIN',
      cityId: user.city?.publicId ?? user.cityId ?? null,
      addressLine: user.addressLine ?? null,
      avatarUrl: user.avatarUrl ?? null,
      city: user.city ? { id: user.city.publicId ?? user.city.id, name: user.city.name } : null,
      isPremium: user.proProfile?.isPremium ?? false,
      kycStatus: user.proProfile?.kycStatus ?? undefined,
    };
  }

  /**
   * SHA-256 du refresh token (on ne stocke jamais le token brut en DB).
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Hash CIN number with salt using SHA-256 (same logic as KycService).
   */
  private hashCin(cinNumber: string): string {
    const salt = this.config.get<string>('CIN_HASH_SALT') || 'khadamat-cin-default-salt';
    const normalized = cinNumber.trim().toUpperCase();
    return crypto.createHash('sha256').update(normalized + salt).digest('hex');
  }

  /**
   * Parse une durée style "7d", "24h", "15m" en millisecondes.
   */
  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) {
      throw new Error(
        `Invalid duration format: "${duration}". Expected format: <number><unit> (e.g. 15m, 7d, 24h).`,
      );
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
