import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import type { SubmitKycDto } from './kyc.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly kycDir = path.join(process.cwd(), 'uploads', 'kyc');
  private readonly cinSalt: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const salt = this.config.get<string>('CIN_HASH_SALT');
    if (!salt || salt.length < 32) {
      throw new Error(
        'FATAL: CIN_HASH_SALT is missing or too weak (min 32 chars).',
      );
    }
    this.cinSalt = salt;
  }

  /**
   * Hash CIN number with salt using SHA-256
   */
  private hashCin(cinNumber: string): string {
    const normalized = cinNumber.trim().toUpperCase();
    return crypto.createHash('sha256').update(normalized + this.cinSalt).digest('hex');
  }

  /**
   * Validate file content via magic bytes (not MIME type from client).
   * Accepts: JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF...WEBP).
   */
  validateMagicBytes(file: Express.Multer.File): void {
    const fd = fs.openSync(file.path, 'r');
    const header = Buffer.alloc(12);
    fs.readSync(fd, header, 0, 12, 0);
    fs.closeSync(fd);

    const isJpeg =
      header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPng =
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;
    const isWebp =
      header.toString('ascii', 0, 4) === 'RIFF' &&
      header.toString('ascii', 8, 12) === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      // Clean up the spoofed file
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* best-effort cleanup */
      }
      throw new BadRequestException({
        message:
          'Type de fichier non autorisé. Le contenu ne correspond pas à une image valide.',
        code: 'KYC_FILE_SPOOFED_TYPE',
      });
    }
  }

  async submitKyc(userId: string, dto: SubmitKycDto) {
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { kycStatus: true },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    // Status guards
    if (existingProfile.kycStatus === 'PENDING') {
      throw new BadRequestException({
        message: 'Un dossier KYC est déjà en cours de vérification.',
        code: 'KYC_ALREADY_PENDING',
      });
    }
    if (existingProfile.kycStatus === 'APPROVED') {
      throw new BadRequestException({
        message: 'Votre dossier KYC est déjà approuvé.',
        code: 'KYC_ALREADY_APPROVED',
      });
    }
    if (existingProfile.kycStatus === 'REJECTED') {
      throw new BadRequestException({
        message: 'Votre dossier a été rejeté. Utilisez la re-soumission.',
        code: 'KYC_USE_RESUBMIT',
      });
    }

    const cinHash = this.hashCin(dto.cinNumber);

    // Check uniqueness of cinHash
    const existingCin = await this.prisma.proProfile.findFirst({
      where: { cinHash, userId: { not: userId } },
    });
    if (existingCin) {
      throw new ConflictException({
        message: 'Données en conflit',
        code: 'CIN_ALREADY_USED',
      });
    }

    try {
      const updatedProfile = await this.prisma.proProfile.update({
        where: { userId },
        data: {
          cinHash,
          kycCinFrontKey: dto.frontKey,
          kycCinBackKey: dto.backKey,
          kycStatus: 'PENDING',
          kycRejectionReason: null,
        },
        select: {
          userId: true,
          kycStatus: true,
        },
      });

      return {
        userId: updatedProfile.userId,
        kycStatus: updatedProfile.kycStatus,
        hasCinFront: !!dto.frontKey,
        hasCinBack: !!dto.backKey,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Données en conflit');
      }
      throw error;
    }
  }

  async resubmitKyc(
    userId: string,
    dto: { cinNumber?: string; frontKey?: string; backKey?: string },
  ) {
    const existingProfile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: {
        kycStatus: true,
        cinHash: true,
        kycCinFrontKey: true,
        kycCinBackKey: true,
      },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    if (existingProfile.kycStatus !== 'REJECTED') {
      throw new BadRequestException(
        'La re-soumission est autorisée uniquement si le dossier a été rejeté',
      );
    }

    const updateData: any = {
      kycStatus: 'PENDING',
      kycRejectionReason: null,
    };

    if (dto.cinNumber) {
      const cinHash = this.hashCin(dto.cinNumber);
      // Check uniqueness
      if (cinHash !== existingProfile.cinHash) {
        const existingCin = await this.prisma.proProfile.findFirst({
          where: { cinHash, userId: { not: userId } },
        });
        if (existingCin) {
          throw new ConflictException('Données en conflit');
        }
      }
      updateData.cinHash = cinHash;
    }

    if (dto.frontKey) {
      updateData.kycCinFrontKey = dto.frontKey;
    }
    if (dto.backKey) {
      updateData.kycCinBackKey = dto.backKey;
    }

    try {
      const updatedProfile = await this.prisma.proProfile.update({
        where: { userId },
        data: updateData,
        select: {
          userId: true,
          kycStatus: true,
          kycCinFrontKey: true,
          kycCinBackKey: true,
        },
      });

      return {
        userId: updatedProfile.userId,
        kycStatus: updatedProfile.kycStatus,
        hasCinFront: !!updatedProfile.kycCinFrontKey,
        hasCinBack: !!updatedProfile.kycCinBackKey,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Données en conflit');
      }
      throw error;
    }
  }

  async getMyKycStatus(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: {
        kycStatus: true,
        kycRejectionReason: true,
        cinHash: true,
        kycCinFrontKey: true,
        kycCinBackKey: true,
        kycSelfieKey: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    return {
      kycStatus: profile.kycStatus,
      kycRejectionReason: profile.kycRejectionReason,
      hasCinNumber: !!profile.cinHash,
      hasCinFront: !!profile.kycCinFrontKey,
      hasCinBack: !!profile.kycCinBackKey,
      hasSelfie: !!profile.kycSelfieKey,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  KYC FILE ACCESS (secure download proxy)
  // ═══════════════════════════════════════════════════════════════

  private static readonly STREAM_TIMEOUT_MS = 15_000;
  private static readonly VALID_TYPES = ['cin-front', 'cin-back', 'selfie'] as const;

  async resolveKycFileKey(
    proPublicId: string,
    type: 'cin-front' | 'cin-back' | 'selfie',
  ): Promise<string> {
    const selectField =
      type === 'cin-front' ? 'kycCinFrontKey' :
      type === 'cin-back' ? 'kycCinBackKey' :
      'kycSelfieKey';

    const profile = await this.prisma.proProfile.findUnique({
      where: { publicId: proPublicId },
      select: { [selectField]: true },
    });

    if (!profile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    const key = (profile as any)[selectField];
    if (!key) {
      throw new NotFoundException('Fichier non trouvé');
    }

    return key;
  }

  async assertAccess(
    requestingUser: { id: string; role: string },
    proPublicId: string,
  ): Promise<{ proUserId: string }> {
    const profile = await this.prisma.proProfile.findUnique({
      where: { publicId: proPublicId },
      select: { userId: true },
    });

    if (!profile) {
      throw new NotFoundException('Profil Pro non trouvé');
    }

    if (requestingUser.role === 'ADMIN') {
      return { proUserId: profile.userId };
    }

    if (requestingUser.role === 'PRO' && profile.userId === requestingUser.id) {
      return { proUserId: profile.userId };
    }

    throw new ForbiddenException('Accès non autorisé');
  }

  async logAccess(
    userId: string,
    key: string,
    result: 'ALLOW' | 'DENY',
    ip: string,
  ): Promise<void> {
    this.prisma.kycAccessLog
      .create({
        data: { userId, filename: key, result, ip },
      })
      .catch((err) => {
        this.logger.error(`KYC audit write failed: ${err.message}`);
      });
  }

  streamFile(
    key: string,
    res: any,
  ): void {
    // Extract filename from key (may be full URL from migration or just a filename)
    const filename = path.basename(key);
    const safeFilename = path.basename(filename);

    if (safeFilename !== filename || filename.includes('..')) {
      throw new BadRequestException('Nom de fichier invalide');
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExts.includes(ext)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }

    const filePath = path.join(this.kycDir, safeFilename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    const stream = fs.createReadStream(filePath);

    const timeout = setTimeout(() => {
      stream.destroy(new Error('Stream timeout'));
    }, KycService.STREAM_TIMEOUT_MS);

    stream.on('end', () => clearTimeout(timeout));
    stream.on('error', () => clearTimeout(timeout));
    stream.on('close', () => clearTimeout(timeout));

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="kyc-file"',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Download-Options': 'noopen',
      'Content-Security-Policy': "default-src 'none'",
    });

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  }

  static isValidType(type: string): type is 'cin-front' | 'cin-back' | 'selfie' {
    return (KycService.VALID_TYPES as readonly string[]).includes(type);
  }
}
