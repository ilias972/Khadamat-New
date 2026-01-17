import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard
 *
 * Guard pour protéger les routes nécessitant une authentification
 * Utilise automatiquement la JwtStrategy
 *
 * Usage :
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user; // Contient le PublicUser retourné par JwtStrategy
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
