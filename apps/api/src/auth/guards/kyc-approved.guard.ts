import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * KycApprovedGuard
 *
 * Vérifie que les utilisateurs PRO ont un KYC approuvé.
 * - Si user.role !== 'PRO' → passe (CLIENT/ADMIN non affectés)
 * - Si user.role === 'PRO' → vérifie kycStatus === 'APPROVED'
 *
 * ⚠️ Doit être utilisé APRÈS JwtAuthGuard (qui attache req.user)
 */
@Injectable()
export class KycApprovedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'PRO') {
      return true;
    }

    const proProfile = await this.prisma.proProfile.findUnique({
      where: { userId: user.id },
      select: { kycStatus: true },
    });

    if (!proProfile || proProfile.kycStatus !== 'APPROVED') {
      throw new ForbiddenException({
        message: 'KYC non approuvé',
        code: 'KYC_NOT_APPROVED',
      });
    }

    return true;
  }
}
