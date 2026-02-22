import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, ForbiddenException } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { ProController } from './pro/pro.controller';
import { ProService } from './pro/pro.service';
import { BookingController } from './booking/booking.controller';
import { BookingService } from './booking/booking.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { KycApprovedGuard } from './auth/guards/kyc-approved.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './database/prisma.service';

/**
 * RBAC E2E Tests
 *
 * Tests HTTP-level RBAC enforcement:
 * 1. PATCH /users/me → CLIENT only
 * 2. KYC gate on PRO mutation endpoints
 * 3. KYC service-level check on cancel PRO branch
 */

// Shared mock user — overridden per test
let mockUser: { id: string; role: string } = { id: 'user_1', role: 'CLIENT' };

// Mock KYC status returned by PrismaService
let mockKycStatus: string | null = 'APPROVED';

describe('RBAC E2E', () => {
  let app: INestApplication;

  const usersService = {
    updateProfile: jest.fn().mockResolvedValue({ id: 'user_1', firstName: 'Test' }),
  };

  const proService = {
    getMyDashboard: jest.fn().mockResolvedValue({ id: 'pro_1' }),
    updateProfile: jest.fn().mockResolvedValue({ ok: true }),
    updateServices: jest.fn().mockResolvedValue({ ok: true }),
    updateAvailability: jest.fn().mockResolvedValue({ ok: true }),
    getPortfolio: jest.fn().mockResolvedValue([]),
    addPortfolioImage: jest.fn().mockResolvedValue({ id: 'img_1' }),
    deletePortfolioImage: jest.fn().mockResolvedValue({ ok: true }),
  };

  const bookingService = {
    getAvailableSlots: jest.fn().mockResolvedValue([]),
    createBooking: jest.fn().mockResolvedValue({ id: 'booking_1' }),
    getMyBookings: jest.fn().mockResolvedValue([]),
    updateBookingStatus: jest.fn().mockResolvedValue({ id: 'booking_1', status: 'CONFIRMED' }),
    updateBooking: jest.fn().mockResolvedValue({ id: 'booking_1', status: 'WAITING_FOR_CLIENT' }),
    respondToModification: jest.fn().mockResolvedValue({ id: 'booking_1', status: 'CONFIRMED' }),
    completeBooking: jest.fn().mockResolvedValue({ id: 'booking_1', status: 'COMPLETED' }),
    cancelBooking: jest.fn().mockResolvedValue({ id: 'booking_1', status: 'CANCELLED_BY_CLIENT' }),
  };

  const prismaService = {
    proProfile: {
      findUnique: jest.fn().mockImplementation(() => {
        if (mockKycStatus === null) return Promise.resolve(null);
        return Promise.resolve({ kycStatus: mockKycStatus });
      }),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController, ProController, BookingController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: ProService, useValue: proService },
        { provide: BookingService, useValue: bookingService },
        { provide: PrismaService, useValue: prismaService },
        RolesGuard,
        KycApprovedGuard,
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { ...mockUser };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'user_1', role: 'CLIENT' };
    mockKycStatus = 'APPROVED';
  });

  // ═══════════════════════════════════════════════════════════════
  //  PATCH /users/me — CLIENT only
  // ═══════════════════════════════════════════════════════════════

  describe('PATCH /users/me RBAC', () => {
    it('should allow CLIENT to update profile (200)', async () => {
      mockUser = { id: 'client_1', role: 'CLIENT' };

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ firstName: 'Ali' });

      expect(res.status).toBe(200);
      expect(usersService.updateProfile).toHaveBeenCalledWith('client_1', expect.any(Object));
    });

    it('should reject PRO from updating user profile (403)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ firstName: 'Ali' });

      expect(res.status).toBe(403);
      expect(usersService.updateProfile).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  KYC gate on PRO endpoints
  // ═══════════════════════════════════════════════════════════════

  describe('KYC gate on PRO endpoints', () => {
    it('should reject PRO with kycStatus=PENDING on PUT /pro/services (403)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };
      mockKycStatus = 'PENDING';

      const validService = [{
        categoryId: 'cat_plomberie_001',
        pricingType: 'FIXED',
        fixedPriceMad: 200,
        isActive: true,
      }];

      const res = await request(app.getHttpServer())
        .put('/pro/services')
        .send(validService);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('KYC_NOT_APPROVED');
      expect(proService.updateServices).not.toHaveBeenCalled();
    });

    it('should reject PRO with kycStatus=REJECTED on PATCH /bookings/b1/status (403)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };
      mockKycStatus = 'REJECTED';

      const res = await request(app.getHttpServer())
        .patch('/bookings/b1/status')
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('KYC_NOT_APPROVED');
      expect(bookingService.updateBookingStatus).not.toHaveBeenCalled();
    });

    it('should allow PRO with kycStatus=APPROVED on PUT /pro/services (200)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };
      mockKycStatus = 'APPROVED';

      const validService = [{
        categoryId: 'cat_plomberie_001',
        pricingType: 'FIXED',
        fixedPriceMad: 200,
        isActive: true,
      }];

      const res = await request(app.getHttpServer())
        .put('/pro/services')
        .send(validService);

      expect(res.status).toBe(200);
      expect(proService.updateServices).toHaveBeenCalled();
    });

    it('should allow PRO with kycStatus=APPROVED on PATCH /bookings/b1/status (200)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };
      mockKycStatus = 'APPROVED';

      const res = await request(app.getHttpServer())
        .patch('/bookings/b1/status')
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(bookingService.updateBookingStatus).toHaveBeenCalled();
    });

    it('should reject PRO with kycStatus=PENDING on PATCH /bookings/b1/duration (403)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };
      mockKycStatus = 'PENDING';

      const res = await request(app.getHttpServer())
        .patch('/bookings/b1/duration')
        .send({ duration: 2 });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('KYC_NOT_APPROVED');
    });

    it('should reject PRO with kycStatus=PENDING on PATCH /bookings/b1/complete (403)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };
      mockKycStatus = 'PENDING';

      const res = await request(app.getHttpServer())
        .patch('/bookings/b1/complete');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('KYC_NOT_APPROVED');
    });

    it('should reject PRO with no proProfile on PATCH /pro/profile (403)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };
      mockKycStatus = null; // No profile found

      const res = await request(app.getHttpServer())
        .patch('/pro/profile')
        .send({ phone: '+212600000000' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('KYC_NOT_APPROVED');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  CLIENT not affected by KYC gate
  // ═══════════════════════════════════════════════════════════════

  describe('CLIENT not affected by KYC gate', () => {
    it('should allow CLIENT to cancel booking (KYC guard passthrough)', async () => {
      mockUser = { id: 'client_1', role: 'CLIENT' };

      const res = await request(app.getHttpServer())
        .patch('/bookings/b1/cancel')
        .send({});

      expect(res.status).toBe(200);
      expect(bookingService.cancelBooking).toHaveBeenCalledWith(
        'b1',
        'client_1',
        'CLIENT',
        expect.any(Object),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  KYC service-level on cancel PRO
  // ═══════════════════════════════════════════════════════════════

  describe('KYC service-level on cancel PRO', () => {
    it('should reject PRO with kycStatus=PENDING on cancel (service-level 403)', async () => {
      mockUser = { id: 'pro_1', role: 'PRO' };

      // Make the service throw KYC_NOT_APPROVED (simulates the service-level check)
      bookingService.cancelBooking.mockRejectedValueOnce(
        new ForbiddenException({ message: 'KYC non approuvé', code: 'KYC_NOT_APPROVED' }),
      );

      const res = await request(app.getHttpServer())
        .patch('/bookings/b1/cancel')
        .send({ reason: 'Je ne suis pas disponible' });

      expect(res.status).toBe(403);
    });
  });
});
