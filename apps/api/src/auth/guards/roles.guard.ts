import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@khadamat/contracts';

/**
 * RolesGuard
 *
 * Guard pour vérifier le rôle de l'utilisateur.
 * Utilise un décorateur @Roles() pour spécifier les rôles autorisés.
 *
 * ⚠️ Ce guard doit être utilisé APRÈS JwtAuthGuard (qui attache req.user)
 *
 * Exemple d'utilisation :
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('PRO')
 * async getMyDashboard(@Request() req) { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true; // Pas de restriction de rôle
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Accès refusé. Rôle requis: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
