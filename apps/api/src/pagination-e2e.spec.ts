import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { BookingController } from './booking/booking.controller';
import { BookingService } from './booking/booking.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { KycApprovedGuard } from './auth/guards/kyc-approved.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './database/prisma.service';
import { CatalogResolverService } from './catalog/catalog-resolver.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

let mockUser = { id: 'user_1', role: 'CLIENT' };

describe('Pagination E2E', () => {
  let app: INestApplication;

  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    proProfile: {
      findUnique: jest.fn().mockResolvedValue({ kycStatus: 'APPROVED' }),
    },
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
    ),
  };

  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  };

  const catalogResolver = {
    resolveCityId: jest.fn(),
    resolveCategoryId: jest.fn(),
  };

  const eventEmitter = { emit: jest.fn() };

  const bookingService = {
    getAvailableSlots: jest.fn(),
    createBooking: jest.fn(),
    getMyBookings: jest.fn(),
    updateBookingStatus: jest.fn(),
    updateBooking: jest.fn(),
    respondToModification: jest.fn(),
    completeBooking: jest.fn(),
    cancelBooking: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController, BookingController],
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: CatalogResolverService, useValue: catalogResolver },
        { provide: BookingService, useValue: bookingService },
        { provide: EventEmitter2, useValue: eventEmitter },
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
    cache.get.mockResolvedValue(null);
    mockUser = { id: 'user_1', role: 'CLIENT' };
  });

  // ═══════════════════════════════════════════════════════════════
  //  GET /public/pros/v2 — pagination meta
  // ═══════════════════════════════════════════════════════════════

  describe('GET /public/pros/v2 pagination', () => {
    it('should return meta with defaults (page=1, limit=20)', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(45);

      const res = await request(app.getHttpServer())
        .get('/public/pros/v2');

      expect(res.status).toBe(200);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
      expect(res.body.data).toEqual([]);
    });

    it('should respect page=2 limit=5', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(12);

      const res = await request(app.getHttpServer())
        .get('/public/pros/v2?page=2&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.meta.total).toBe(12);
      expect(res.body.meta.totalPages).toBe(3);
      expect(res.body.meta.hasNext).toBe(true);
      expect(res.body.meta.hasPrev).toBe(true);

      // Verify skip/take passed to Prisma
      const findManyCall = prisma.user.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(5);
      expect(findManyCall.take).toBe(5);
    });

    it('should reject limit > 50 with 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/pros/v2?limit=51');

      expect(res.status).toBe(400);
    });

    it('should reject page < 1 with 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/pros/v2?page=0');

      expect(res.status).toBe(400);
    });

    it('should reject limit < 1 with 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/pros/v2?limit=0');

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  GET /bookings — pagination meta
  // ═══════════════════════════════════════════════════════════════

  describe('GET /bookings pagination', () => {
    it('should return {data, meta} with defaults', async () => {
      bookingService.getMyBookings.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 35, totalPages: 2, hasNext: true, hasPrev: false },
      });

      const res = await request(app.getHttpServer())
        .get('/bookings');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 35,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should pass page=2 limit=5 to service', async () => {
      bookingService.getMyBookings.mockResolvedValue({
        data: [],
        meta: { page: 2, limit: 5, total: 12, totalPages: 3, hasNext: true, hasPrev: true },
      });

      const res = await request(app.getHttpServer())
        .get('/bookings?page=2&limit=5');

      expect(res.status).toBe(200);
      expect(bookingService.getMyBookings).toHaveBeenCalledWith('user_1', 'CLIENT', 2, 5);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.limit).toBe(5);
    });

    it('should reject limit > 50 with 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings?limit=51');

      expect(res.status).toBe(400);
    });

    it('should reject page=0 with 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings?page=0');

      expect(res.status).toBe(400);
    });
  });
});
