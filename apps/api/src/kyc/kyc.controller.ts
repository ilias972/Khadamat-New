import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { multerConfig } from './multer.config';
import { SubmitKycSchema, type SubmitKycDto, type UploadResponseDto } from './kyc.dto';

/**
 * KycController
 *
 * Controller pour la gestion du KYC (Know Your Customer) des professionnels.
 * Tous les endpoints sont protégés par JwtAuthGuard + RolesGuard (PRO uniquement).
 *
 * Routes :
 * - POST /api/kyc/upload : Upload d'une image CIN (recto ou verso)
 * - POST /api/kyc/submit : Soumission du dossier KYC complet
 * - GET /api/kyc/status : Récupérer le statut KYC
 */
@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PRO')
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /api/kyc/upload
   *
   * Upload d'une image CIN (recto ou verso).
   * Retourne l'URL publique du fichier uploadé.
   *
   * Sécurité :
   * - Accepte uniquement images (jpg, png, webp)
   * - Limite : 5MB
   * - Stockage local : ./uploads/kyc/
   * - Fichier renommé avec UUID
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  uploadImage(@UploadedFile() file: Express.Multer.File): UploadResponseDto {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Construire l'URL publique
    const baseUrl = this.config.get<string>('PUBLIC_URL') || 'http://localhost:3001';
    const publicUrl = `${baseUrl}/uploads/kyc/${file.filename}`;

    return {
      url: publicUrl,
      filename: file.filename,
    };
  }

  /**
   * POST /api/kyc/submit
   *
   * Soumet le dossier KYC complet avec :
   * - cinNumber : Numéro CIN (normalisé automatiquement)
   * - frontUrl : URL de la photo CIN recto
   * - backUrl : URL de la photo CIN verso
   *
   * Passe le kycStatus à PENDING.
   * Gère l'erreur d'unicité du CIN.
   */
  @Post('submit')
  async submitKyc(
    @Request() req,
    @Body(new ZodValidationPipe(SubmitKycSchema)) dto: SubmitKycDto,
  ) {
    return this.kycService.submitKyc(req.user.id, dto);
  }

  /**
   * GET /api/kyc/status
   *
   * Récupère le statut KYC du PRO connecté.
   * Retourne : { kycStatus, kycRejectionReason, hasCinNumber }
   */
  @Get('status')
  async getMyKycStatus(@Request() req) {
    return this.kycService.getMyKycStatus(req.user.id);
  }
}
