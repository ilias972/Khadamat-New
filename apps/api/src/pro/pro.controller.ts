import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProService } from './pro.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  UpdateProProfileSchema,
  UpdateServicesSchema,
  UpdateAvailabilitySchema,
  type UpdateProProfileInput,
  type UpdateServicesInput,
  type UpdateAvailabilityInput,
} from '@khadamat/contracts';

/**
 * ProController
 *
 * Controller pour les endpoints de gestion du profil Pro.
 * Tous les endpoints sont protégés par JwtAuthGuard et RolesGuard (PRO uniquement).
 *
 * Routes :
 * - GET /api/pro/me : Récupérer le dashboard
 * - PATCH /api/pro/profile : Mettre à jour le profil (WhatsApp, ville)
 * - PUT /api/pro/services : Mettre à jour les services (UPSERT)
 * - PUT /api/pro/availability : Mettre à jour les disponibilités (REPLACE ALL)
 */
@Controller('pro')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PRO')
export class ProController {
  constructor(private readonly proService: ProService) {}

  /**
   * GET /api/pro/me
   *
   * Récupère le dashboard complet du PRO :
   * - user : Informations utilisateur
   * - profile : Profil Pro (ville, whatsapp, KYC, etc.)
   * - services : Services proposés
   * - availability : Disponibilités hebdomadaires
   */
  @Get('me')
  async getMyDashboard(@Request() req) {
    return this.proService.getMyDashboard(req.user.id);
  }

  /**
   * PATCH /api/pro/profile
   *
   * Met à jour le profil du PRO.
   * - whatsapp : Numéro WhatsApp (requis, format 06XXXXXXXX ou 07XXXXXXXX)
   * - cityId : Ville (optionnel, permet de corriger une erreur d'inscription)
   */
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body(new ZodValidationPipe(UpdateProProfileSchema))
    dto: UpdateProProfileInput,
  ) {
    return this.proService.updateProfile(req.user.id, dto);
  }

  /**
   * PUT /api/pro/services
   *
   * Met à jour les services proposés par le PRO.
   * Stratégie UPSERT : Pour chaque service, on fait un upsert basé sur [proUserId, categoryId].
   *
   * Body : Array de services
   * Chaque service contient :
   * - categoryId : ID de la catégorie
   * - pricingType : "FIXED" ou "RANGE"
   * - fixedPriceMad : Prix fixe (requis si FIXED)
   * - minPriceMad : Prix minimum (requis si RANGE)
   * - maxPriceMad : Prix maximum (requis si RANGE)
   * - isActive : Service actif ou non
   */
  @Put('services')
  async updateServices(
    @Request() req,
    @Body(new ZodValidationPipe(UpdateServicesSchema))
    dto: UpdateServicesInput,
  ) {
    return this.proService.updateServices(req.user.id, dto);
  }

  /**
   * PUT /api/pro/availability
   *
   * Met à jour les disponibilités hebdomadaires du PRO.
   * Stratégie REPLACE ALL : Supprime toutes les disponibilités existantes et recrée les nouvelles.
   *
   * Body : Array de créneaux
   * Chaque créneau contient :
   * - dayOfWeek : Jour de la semaine (0=Dimanche, 1=Lundi, ..., 6=Samedi)
   * - startMin : Heure de début en minutes depuis 00:00 (ex: 9h00 = 540)
   * - endMin : Heure de fin en minutes depuis 00:00 (ex: 18h00 = 1080)
   * - isActive : Créneau actif ou non
   */
  @Put('availability')
  async updateAvailability(
    @Request() req,
    @Body(new ZodValidationPipe(UpdateAvailabilitySchema))
    dto: UpdateAvailabilityInput,
  ) {
    return this.proService.updateAvailability(req.user.id, dto);
  }
}
