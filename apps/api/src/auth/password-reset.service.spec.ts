import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { FailedLoginService } from './failed-login.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

describe('AuthService — Password Reset', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    phone: '0612345678',
    status: 'ACTIVE',
  };

  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((args: any[]) => Promise.all(args)),
  };

  const notifications = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  const configService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'a-secret-key-that-is-at-least-32-chars-long!!',
        JWT_ACCESS_EXPIRES: '15m',
        JWT_REFRESH_EXPIRES: '7d',
        FRONTEND_URL: 'http://localhost:3000',
        CIN_HASH_SALT: 'test-salt-that-is-at-least-32-characters-long!!',
      };
      return config[key];
    }),
  };

  const jwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt'),
  };

  const failedLogin = {
    isLocked: jest.fn().mockReturnValue(0),
    recordFailure: jest.fn(),
    resetAttempts: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: FailedLoginService, useValue: failedLogin },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ═══════════════════════════════════════════════════════════════
  //  requestPasswordReset
  // ═══════════════════════════════════════════════════════════════

  describe('requestPasswordReset', () => {
    it('should return generic message when user exists (email)', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'token_1' });

      const result = await service.requestPasswordReset({ email: 'test@example.com' });

      expect(result.message).toBe('Si ce compte existe, vous recevrez des instructions.');
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      expect(notifications.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should return generic message when user exists (phone)', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, email: null });
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'token_1' });

      const result = await service.requestPasswordReset({ phone: '0612345678' });

      expect(result.message).toBe('Si ce compte existe, vous recevrez des instructions.');
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      // No email to send to (phone-only user)
      expect(notifications.sendEmail).not.toHaveBeenCalled();
    });

    it('should return same generic message when user does NOT exist (anti-enumeration)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset({ email: 'nonexistent@example.com' });

      expect(result.message).toBe('Si ce compte existe, vous recevrez des instructions.');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(notifications.sendEmail).not.toHaveBeenCalled();
    });

    it('should return same generic message for suspended user', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });

      const result = await service.requestPasswordReset({ email: 'test@example.com' });

      expect(result.message).toBe('Si ce compte existe, vous recevrez des instructions.');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should store tokenHash (not raw token) in DB', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'token_1' });

      await service.requestPasswordReset({ email: 'test@example.com' });

      const createCall = prisma.passwordResetToken.create.mock.calls[0][0];
      const storedHash = createCall.data.tokenHash;

      // tokenHash should be a 64-char hex string (SHA-256 of 32-byte token)
      expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
      expect(createCall.data.userId).toBe('user_123');
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw if both email and phone provided', async () => {
      await expect(
        service.requestPasswordReset({ email: 'test@example.com', phone: '0612345678' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if neither email nor phone provided', async () => {
      await expect(
        service.requestPasswordReset({}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  resetPassword
  // ═══════════════════════════════════════════════════════════════

  describe('resetPassword', () => {
    const validToken = crypto.randomBytes(32).toString('hex');
    const validTokenHash = crypto.createHash('sha256').update(validToken).digest('hex');

    const mockResetToken = {
      id: 'reset_1',
      userId: 'user_123',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
      usedAt: null,
    };

    it('should update password, revoke tokens, and mark used on valid reset', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.resetPassword({
        token: validToken,
        newPassword: 'NewPass123!',
      });

      expect(result.message).toBe('Mot de passe mis à jour.');

      // Verify $transaction was called with 3 operations
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const txArgs = prisma.$transaction.mock.calls[0][0];
      expect(txArgs).toHaveLength(3);

      // Verify user password update was called
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_123' },
          data: { password: expect.any(String) },
        }),
      );

      // Verify password is bcrypt hashed
      const updateCall = prisma.user.update.mock.calls[0][0];
      const isValidBcrypt = await bcrypt.compare('NewPass123!', updateCall.data.password);
      expect(isValidBcrypt).toBe(true);

      // Verify token marked as used
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reset_1' },
          data: { usedAt: expect.any(Date) },
        }),
      );

      // Verify all refresh tokens revoked
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', revoked: false },
        data: { revoked: true },
      });
    });

    it('should throw BadRequest for expired token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        ...mockResetToken,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      await expect(
        service.resetPassword({ token: validToken, newPassword: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest for already-used token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        ...mockResetToken,
        usedAt: new Date(), // already used
      });

      await expect(
        service.resetPassword({ token: validToken, newPassword: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest for non-existent token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: validToken, newPassword: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use generic error message (no information leakage)', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      try {
        await service.resetPassword({ token: validToken, newPassword: 'NewPass123!' });
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toBe('Lien invalide ou expiré.');
      }
    });
  });
});
