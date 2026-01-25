import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ApiConsumes } from '@nestjs/swagger';
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
   * POST /api/kyc/resubmit
   *
   * Re-soumission du dossier KYC après rejet.
   * Accessible uniquement si kycStatus === 'REJECTED'.
   *
   * Format : multipart/form-data
   * Champs optionnels : cinNumber (texte), cinFront (fichier), cinBack (fichier)
   * - Si cinNumber fourni, met à jour le numéro CIN
   * - Si fichiers fournis, met à jour les URLs
   * - Repasse le statut à PENDING
   */
  @Post('resubmit')
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
  async resubmitKyc(
    @Request() req,
    @Body() body: any,
    @UploadedFiles()
    files: {
      cinFront?: Express.Multer.File[];
      cinBack?: Express.Multer.File[];
    },
  ) {
    // Vérifier que le statut est REJECTED
    const status = await this.kycService.getMyKycStatus(req.user.id);
    if (status.kycStatus !== 'REJECTED') {
      throw new ForbiddenException(
        'La re-soumission est autorisée uniquement si le dossier a été rejeté',
      );
    }

    // Extract files
    const cinFrontFile = files?.cinFront?.[0];
    const cinBackFile = files?.cinBack?.[0];

    // Générer les URLs publiques pour les nouveaux fichiers
    const baseUrl = this.config.get<string>('PUBLIC_URL') || 'http://localhost:3001';
    const frontUrl = cinFrontFile ? `${baseUrl}/uploads/kyc/${cinFrontFile.filename}` : undefined;
    const backUrl = cinBackFile ? `${baseUrl}/uploads/kyc/${cinBackFile.filename}` : undefined;

    // Construire le DTO de re-soumission
    const resubmitDto = {
      cinNumber: body.cinNumber?.trim().toUpperCase() || undefined,
      frontUrl,
      backUrl,
    };

    return this.kycService.resubmitKyc(req.user.id, resubmitDto);
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
