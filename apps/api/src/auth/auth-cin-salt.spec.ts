import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { FailedLoginService } from './failed-login.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AuthService — CIN_HASH_SALT boot validation', () => {
  const prisma = { user: {}, passwordResetToken: {}, refreshToken: {} };
  const jwtService = { sign: jest.fn() };
  const failedLogin = { isLocked: jest.fn(), recordFailure: jest.fn(), resetAttempts: jest.fn() };
  const notifications = { sendEmail: jest.fn() };

  function makeConfig(saltValue: string | undefined) {
    return {
      get: jest.fn((key: string) => {
        const config: Record<string, string | undefined> = {
          JWT_SECRET: 'a-secret-key-that-is-at-least-32-chars-long!!',
          JWT_ACCESS_EXPIRES: '15m',
          JWT_REFRESH_EXPIRES: '7d',
          FRONTEND_URL: 'http://localhost:3000',
          CIN_HASH_SALT: saltValue,
        };
        return config[key];
      }),
    };
  }

  it('should throw at boot if CIN_HASH_SALT is missing', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: makeConfig(undefined) },
          { provide: FailedLoginService, useValue: failedLogin },
          { provide: NotificationsService, useValue: notifications },
        ],
      }).compile(),
    ).rejects.toThrow('FATAL: CIN_HASH_SALT is missing or too weak');
  });

  it('should throw at boot if CIN_HASH_SALT is too short (< 32 chars)', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: makeConfig('short-salt') },
          { provide: FailedLoginService, useValue: failedLogin },
          { provide: NotificationsService, useValue: notifications },
        ],
      }).compile(),
    ).rejects.toThrow('FATAL: CIN_HASH_SALT is missing or too weak');
  });

  it('should boot successfully with a valid CIN_HASH_SALT (>= 32 chars)', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: makeConfig('a-valid-salt-that-is-at-least-32-characters!!') },
        { provide: FailedLoginService, useValue: failedLogin },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    expect(module.get(AuthService)).toBeDefined();
  });
});
