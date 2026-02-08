import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import sharp from 'sharp';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { multerConfig } from '../kyc/multer.config';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { PublicUser } from '@khadamat/contracts';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(res: Response, payload: { accessToken: string; refreshToken: string }): void {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', payload.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('accessToken', payload.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
    });

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
  }

  private requireCsrf(req: any): void {
    if (req.headers['x-csrf-protection'] !== '1') {
      throw new ForbiddenException('Accès refusé');
    }
  }

  private getCookie(req: any, name: string): string | undefined {
    const raw = req.headers?.cookie;
    if (!raw || typeof raw !== 'string') return undefined;
    const match = raw.split(';').find((c: string) => c.trim().startsWith(`${name}=`));
    return match ? match.split('=').slice(1).join('=').trim() : undefined;
  }

  /**
   * POST /api/auth/register
   * Inscription ATOMIQUE d'un nouveau Client ou Pro
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cinFront', maxCount: 1 },
        { name: 'cinBack', maxCount: 1 },
      ],
      multerConfig,
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Inscription atomique Client/Pro avec KYC' })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 409, description: 'Email, téléphone ou CIN déjà utilisé' })
  @ApiResponse({ status: 400, description: 'Données invalides ou fichiers manquants (PRO)' })
  async register(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: RegisterDto,
    @UploadedFiles()
    files: {
      cinFront?: Express.Multer.File[];
      cinBack?: Express.Multer.File[];
    },
  ) {
    const cinFrontFile = files?.cinFront?.[0];
    const cinBackFile = files?.cinBack?.[0];

    const hasAnyFile = !!(cinFrontFile || cinBackFile);

    if (body.role === 'CLIENT' && hasAnyFile) {
      throw new BadRequestException('Les fichiers KYC ne sont pas autorisés pour un client');
    }

    if (body.role === 'PRO') {
      if (!body.cinNumber || body.cinNumber.trim().length === 0) {
        throw new BadRequestException('Le numéro CIN est obligatoire pour les professionnels');
      }
      if (!cinFrontFile) {
        throw new BadRequestException('La photo CIN recto est obligatoire pour les professionnels');
      }
      if (!cinBackFile) {
        throw new BadRequestException('La photo CIN verso est obligatoire pour les professionnels');
      }

      const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
      const MAX_SIZE = 5 * 1024 * 1024;

      for (const file of [cinFrontFile, cinBackFile]) {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          throw new BadRequestException(
            `Type de fichier non autorisé : ${file.originalname}. Acceptés : jpg, png, webp`,
          );
        }
        if (file.size > MAX_SIZE) {
          throw new BadRequestException(
            `Fichier trop volumineux : ${file.originalname}. Maximum : 5 Mo`,
          );
        }
        if (file.size === 0) {
          throw new BadRequestException(
            `Fichier vide : ${file.originalname}`,
          );
        }

        const fd = fs.openSync(file.path, 'r');
        const header = Buffer.alloc(12);
        fs.readSync(fd, header, 0, 12, 0);
        fs.closeSync(fd);

        const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
        const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
        const isWebp = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';

        if (!isJpeg && !isPng && !isWebp) {
          throw new BadRequestException('Fichier corrompu ou type réel non autorisé');
        }

        try {
          const rebuiltBuffer = await sharp(file.path)
            .rotate()
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();

          fs.writeFileSync(file.path, rebuiltBuffer);
        } catch {
          throw new BadRequestException("Fichier corrompu ou non décodable");
        }

        const scanSize = Math.min(65536, fs.statSync(file.path).size);
        const scanBuf = Buffer.alloc(scanSize);
        const scanFd = fs.openSync(file.path, 'r');
        fs.readSync(scanFd, scanBuf, 0, scanSize, 0);
        fs.closeSync(scanFd);

        const content = scanBuf.toString('latin1').toLowerCase();
        if (
          content.includes('<?php') ||
          content.includes('<script') ||
          content.includes('#!/')
        ) {
          throw new BadRequestException('Fichier suspect');
        }
        if (scanBuf[0] === 0x4D && scanBuf[1] === 0x5A) {
          throw new BadRequestException('Fichier suspect');
        }
        if (scanBuf[0] === 0x50 && scanBuf[1] === 0x4B && scanBuf[2] === 0x03 && scanBuf[3] === 0x04) {
          throw new BadRequestException('Fichier suspect');
        }
      }
    }

    if (body.role === 'CLIENT') {
      if (!body.addressLine || body.addressLine.trim().length === 0) {
        throw new BadRequestException("L'adresse est obligatoire pour les clients");
      }
    }

    const dto = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      password: body.password,
      role: body.role,
      cityId: body.cityId,
      addressLine: body.addressLine || undefined,
      cinNumber: body.cinNumber || undefined,
    };

    const result = await this.authService.register(dto, cinFrontFile, cinBackFile);

    // Cookies only — tokens never in body
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  /**
   * POST /api/auth/login
   * Connexion avec email OU phone + password
   * Retourne { user } — tokens en cookies httpOnly uniquement
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion avec email ou téléphone' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: LoginDto,
  ) {
    const result = await this.authService.login(dto);

    // Cookies only — tokens never in body
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  /**
   * POST /api/auth/refresh
   * Échange un refresh token contre une nouvelle paire access+refresh.
   * L'ancien refresh est automatiquement révoqué (rotation).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler les tokens (rotation)' })
  @ApiResponse({ status: 200, description: 'Nouveaux tokens émis' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Body(new ValidationPipe()) dto: RefreshTokenDto,
  ) {
    this.requireCsrf(req);

    const token = dto.refreshToken || this.getCookie(req, 'refreshToken');
    if (!token) {
      throw new BadRequestException('Refresh token requis');
    }

    const result = await this.authService.refreshTokens(token);

    // Cookies only — tokens never in body
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  /**
   * POST /api/auth/logout
   * Révoque le refresh token (déconnexion).
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion (révocation du refresh token)' })
  @ApiResponse({ status: 200, description: 'Déconnecté' })
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Body(new ValidationPipe()) dto: RefreshTokenDto,
  ) {
    this.requireCsrf(req);

    const token = dto.refreshToken || this.getCookie(req, 'refreshToken');
    if (token) {
      await this.authService.logout(token);
    }

    this.clearAuthCookies(res);
    return { message: 'Déconnecté' };
  }

  /**
   * GET /api/auth/me
   * Récupère le profil de l'utilisateur connecté (nécessite un access token valide)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupère le profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getMe(@Request() req: any): Promise<PublicUser> {
    return req.user;
  }
}
