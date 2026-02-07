import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { PublicUser } from '@khadamat/contracts';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    // HARD FAIL : l'API ne doit JAMAIS démarrer sans un secret fort
    if (!secret || secret.length < 32) {
      throw new Error(
        'FATAL: JWT_SECRET is missing or too weak (min 32 chars). ' +
        'Set a strong secret in .env before starting the API.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Appelée automatiquement par Passport après vérification du token.
   * Le payload contient { sub: userId, role }.
   */
  async validate(payload: any): Promise<PublicUser> {
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Token invalide');
    }

    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Utilisateur invalide ou inactif');
    }

    return user;
  }
}
