import { Controller, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}
