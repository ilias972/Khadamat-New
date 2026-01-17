import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { PublicUser } from '@khadamat/contracts';

/**
 * JwtStrategy
 *
 * Stratégie Passport pour valider les tokens JWT
 * Utilisée par le JwtAuthGuard
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'khadamat-secret-key-change-in-prod',
    });
  }

  /**
   * Méthode appelée automatiquement par Passport après vérification du token
   * Le payload contient { sub: userId, email, role }
   */
  async validate(payload: any): Promise<PublicUser> {
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Utilisateur invalide ou inactif');
    }

    return user;
  }
}
