import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { RegisterInput, LoginInput, AuthResponse, PublicUser } from '@khadamat/contracts';

/**
 * AuthController
 *
 * Endpoints d'authentification
 * - POST /api/auth/register : Inscription
 * - POST /api/auth/login : Connexion
 * - GET /api/auth/me : Profil utilisateur connecté (protégé)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Inscription d'un nouveau Client ou Pro
   *
   * RÈGLE MÉTIER :
   * - Un seul `phone` à l'inscription
   * - Si PRO : phone copié automatiquement vers ProProfile.whatsapp
   */
  @Post('register')
  @ApiOperation({ summary: 'Inscription d\'un nouveau Client ou Pro' })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async register(@Body() dto: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(dto);
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
