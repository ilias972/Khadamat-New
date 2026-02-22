import { Controller, Patch, Body, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService, UpdateProfileDto } from './users.service';

/**
 * UsersController
 * Gestion du profil utilisateur
 *
 * Endpoints :
 * - PATCH /users/me : Met à jour le profil de l'utilisateur connecté
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PATCH /users/me
   * Met à jour le profil de l'utilisateur connecté
   *
   * @param req - Requête HTTP avec user (injecté par JwtAuthGuard)
   * @param dto - Données à mettre à jour (address, firstName, lastName)
   * @returns Profil mis à jour
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  async updateProfile(
    @Request() req,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}
