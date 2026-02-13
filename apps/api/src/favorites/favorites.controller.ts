import { Controller, Get, Post, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(@Request() req) {
    return this.favoritesService.getFavorites(req.user.id);
  }

  @Post(':proId')
  async addFavorite(@Request() req, @Param('proId') proId: string) {
    return this.favoritesService.addFavorite(req.user.id, proId);
  }

  @Delete(':proId')
  async removeFavorite(@Request() req, @Param('proId') proId: string) {
    return this.favoritesService.removeFavorite(req.user.id, proId);
  }
}
