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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { multerConfig } from '../kyc/multer.config';
import type { LoginInput, AuthResponse, PublicUser } from '@khadamat/contracts';

/**
 * AuthController
 *
 * Endpoints d'authentification
 * - POST /api/auth/register : Inscription (Multipart avec fichiers CIN pour PRO)
 * - POST /api/auth/login : Connexion
 * - GET /api/auth/me : Profil utilisateur connecté (protégé)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Inscription ATOMIQUE d'un nouveau Client ou Pro
   *
   * RÈGLE MÉTIER HARD GATE :
   * - CLIENT : Fichiers CIN optionnels/ignorés
   * - PRO : cinNumber, cinFront, cinBack OBLIGATOIRES (validé par le service)
   * - Si upload échoue pour PRO, compte non créé (transaction atomique)
   *
   * Format : multipart/form-data
   * Champs texte : firstName, lastName, email, phone, password, role, cityId, addressLine?, cinNumber?
   * Fichiers : cinFront?, cinBack? (obligatoires si role=PRO)
   */
  @Post('register')
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
    @Body() body: any,
    @UploadedFiles()
    files: {
      cinFront?: Express.Multer.File[];
      cinBack?: Express.Multer.File[];
    },
  ): Promise<AuthResponse> {
    // Extract files
    const cinFrontFile = files?.cinFront?.[0];
    const cinBackFile = files?.cinBack?.[0];

    // Validation PRO : Fichiers obligatoires
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
    }

    // Construire le DTO
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

    // Appeler le service avec fichiers
    return this.authService.register(dto, cinFrontFile, cinBackFile);
  }

  /**
   * POST /api/auth/login
   * Connexion avec email OU phone + password
   *
   * RÈGLE MÉTIER : Login hybride
   */
  @Post('login')
  @ApiOperation({ summary: 'Connexion avec email ou téléphone' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginInput): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  /**
   * GET /api/auth/me
   * Récupère le profil de l'utilisateur connecté
   *
   * Route protégée : nécessite un JWT valide
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupère le profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getMe(@Request() req): Promise<PublicUser> {
    return req.user; // Injecté par JwtAuthGuard via JwtStrategy
  }
}
