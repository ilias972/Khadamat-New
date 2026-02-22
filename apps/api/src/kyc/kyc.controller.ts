import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { multerConfig } from './multer.config';
import type { UploadResponseDto } from './kyc.dto';
import { ResubmitKycDto } from './dto/resubmit-kyc.dto';

@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PRO')
export class KycController {
  constructor(
    private readonly kycService: KycService,
  ) {}

  /**
   * POST /api/kyc/upload
   *
   * Upload d'une image CIN.
   * Retourne la key privée (jamais une URL publique).
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  uploadImage(@UploadedFile() file: Express.Multer.File): UploadResponseDto {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    return {
      key: file.filename,
      filename: file.filename,
    };
  }

  /**
   * POST /api/kyc/submit
   *
   * Soumission initiale du dossier KYC (multipart/form-data).
   * Accepte : cinNumber (string), cinFront (File), cinBack (File).
   */
  @Post('submit')
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
  async submitKyc(
    @Request() req,
    @Body('cinNumber') cinNumber: string,
    @UploadedFiles()
    files: {
      cinFront?: Express.Multer.File[];
      cinBack?: Express.Multer.File[];
    },
  ) {
    // Input validation with stable error codes
    if (!cinNumber || !cinNumber.trim()) {
      throw new BadRequestException({
        message: 'Le numéro CIN est requis',
        code: 'CIN_REQUIRED',
      });
    }

    const cinFrontFile = files?.cinFront?.[0];
    if (!cinFrontFile) {
      throw new BadRequestException({
        message: 'La photo CIN recto est requise',
        code: 'CIN_FRONT_REQUIRED',
      });
    }

    const cinBackFile = files?.cinBack?.[0];
    if (!cinBackFile) {
      throw new BadRequestException({
        message: 'La photo CIN verso est requise',
        code: 'CIN_BACK_REQUIRED',
      });
    }

    // Validate magic bytes (real file content, not just MIME)
    this.kycService.validateMagicBytes(cinFrontFile);
    this.kycService.validateMagicBytes(cinBackFile);

    return this.kycService.submitKyc(req.user.id, {
      cinNumber: cinNumber.trim().toUpperCase(),
      frontKey: cinFrontFile.filename,
      backKey: cinBackFile.filename,
    });
  }

  /**
   * POST /api/kyc/resubmit
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
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    body: ResubmitKycDto,
    @UploadedFiles()
    files: {
      cinFront?: Express.Multer.File[];
      cinBack?: Express.Multer.File[];
    },
  ) {
    const status = await this.kycService.getMyKycStatus(req.user.id);
    if (status.kycStatus !== 'REJECTED') {
      throw new ForbiddenException(
        'La re-soumission est autorisée uniquement si le dossier a été rejeté',
      );
    }

    const cinFrontFile = files?.cinFront?.[0];
    const cinBackFile = files?.cinBack?.[0];

    if (cinFrontFile) {
      this.kycService.validateMagicBytes(cinFrontFile);
    }
    if (cinBackFile) {
      this.kycService.validateMagicBytes(cinBackFile);
    }

    const frontKey = cinFrontFile ? cinFrontFile.filename : undefined;
    const backKey = cinBackFile ? cinBackFile.filename : undefined;

    const resubmitDto = {
      cinNumber: body.cinNumber?.trim().toUpperCase() || undefined,
      frontKey,
      backKey,
    };

    return this.kycService.resubmitKyc(req.user.id, resubmitDto);
  }

  /**
   * GET /api/kyc/status
   */
  @Get('status')
  async getMyKycStatus(@Request() req) {
    return this.kycService.getMyKycStatus(req.user.id);
  }

  /**
   * GET /api/kyc/files/:type/download?proPublicId=...
   *
   * Secure download proxy for KYC files.
   * Access: ADMIN (any pro) or PRO owner only. CLIENT forbidden.
   * All access (allow + deny) is logged in KycAccessLog.
   */
  @Get('files/:type/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRO', 'ADMIN')
  async downloadKycFile(
    @Request() req,
    @Param('type') type: string,
    @Query('proPublicId') proPublicId: string,
    @Res() res: Response,
  ) {
    const clientIp = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const userId: string = req.user.id;

    if (!KycService.isValidType(type)) {
      await this.kycService.logAccess(userId, `invalid-type:${type}`, 'DENY', clientIp);
      throw new BadRequestException('Type de fichier invalide. Accepté : cin-front, cin-back, selfie');
    }

    if (!proPublicId) {
      await this.kycService.logAccess(userId, 'missing-proPublicId', 'DENY', clientIp);
      throw new BadRequestException('proPublicId requis');
    }

    // AuthZ check
    try {
      await this.kycService.assertAccess(
        { id: userId, role: req.user.role },
        proPublicId,
      );
    } catch (err) {
      await this.kycService.logAccess(userId, `${proPublicId}/${type}`, 'DENY', clientIp);
      throw err;
    }

    // Resolve file key
    let key: string;
    try {
      key = await this.kycService.resolveKycFileKey(proPublicId, type);
    } catch (err) {
      await this.kycService.logAccess(userId, `${proPublicId}/${type}`, 'DENY', clientIp);
      throw err;
    }

    // Log allow and stream
    await this.kycService.logAccess(userId, key, 'ALLOW', clientIp);
    this.kycService.streamFile(key, res);
  }
}
