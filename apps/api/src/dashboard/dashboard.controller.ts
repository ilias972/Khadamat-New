import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * DashboardController
 * Endpoints pour le tableau de bord PRO
 *
 * Endpoints :
 * - GET /dashboard/stats : Récupère les statistiques du dashboard (PRO uniquement)
 */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/stats
   * Récupère les statistiques du tableau de bord PRO Premium
   *
   * @param req - Requête HTTP avec user (injecté par JwtAuthGuard)
   * @returns Statistiques du dashboard
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRO')
  async getStats(@Request() req) {
    return this.dashboardService.getStats(req.user.id, req.user.role);
  }
}
