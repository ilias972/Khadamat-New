import { SetMetadata } from '@nestjs/common';
import type { Role } from '@khadamat/contracts';

/**
 * Décorateur @Roles()
 *
 * Permet de spécifier les rôles autorisés pour un endpoint.
 * Utilisé en conjonction avec RolesGuard.
 *
 * Exemple :
 * @Roles('PRO')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async getMyDashboard(@Request() req) { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
