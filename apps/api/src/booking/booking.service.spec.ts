import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingService } from './booking.service';
import { PrismaService } from '../database/prisma.service';
import { CatalogResolverService } from '../catalog/catalog-resolver.service';

describe('BookingService', () => {
  let service: BookingService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    proProfile: {
      findUnique: jest.fn(),
    },
    proService: {
      findUnique: jest.fn(),
    },
    weeklyAvailability: {
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    bookingEvent: {
      create: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    // Handles both interactive (fn) and batch ([promise]) transactions
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
    ),
  };

  const eventEmitter = {
    emit: jest.fn(),
  };

  const catalogResolver = {
    resolveCityId: jest.fn(),
    resolveCategoryId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: CatalogResolverService, useValue: catalogResolver },
      ],
    }).compile();

    service = module.get(BookingService);
  });

  // ═══════════════════════════════════════════════════════════════
  //  createBooking — existing tests
  // ═══════════════════════════════════════════════════════════════

  describe('createBooking', () => {
    it('should reject booking for pro with kycStatus != APPROVED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'client_1',
        cityId: 'city_1',
        addressLine: '123 Rue Test',
      });

      prisma.proProfile.findUnique.mockResolvedValue({
        cityId: 'city_1',
        kycStatus: 'PENDING',
      });

      catalogResolver.resolveCategoryId.mockResolvedValue('cat_internal');

      await expect(
        service.createBooking('client_1', 'CLIENT', {
          proId: 'pro_1',
          categoryId: 'cat_plumb_001',
          date: '2026-03-15',
          time: '10:00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject booking for pro with kycStatus REJECTED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'client_1',
        cityId: 'city_1',
        addressLine: '123 Rue Test',
      });

      prisma.proProfile.findUnique.mockResolvedValue({
        cityId: 'city_1',
        kycStatus: 'REJECTED',
      });

      catalogResolver.resolveCategoryId.mockResolvedValue('cat_internal');

      await expect(
        service.createBooking('client_1', 'CLIENT', {
          proId: 'pro_1',
          categoryId: 'cat_plumb_001',
          date: '2026-03-15',
          time: '10:00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  createBooking — SLOT_TAKEN (concurrent creation)
  // ═══════════════════════════════════════════════════════════════

  describe('createBooking — slot conflict', () => {
    const futureDate = '2026-06-15';
    const futureTime = '10:00';

    function setupCreateMocks() {
      prisma.user.findUnique.mockResolvedValue({
        id: 'client_1',
        cityId: 'city_1',
        addressLine: '123 Rue Test',
      });
      prisma.proProfile.findUnique.mockResolvedValue({
        cityId: 'city_1',
        kycStatus: 'APPROVED',
      });
      catalogResolver.resolveCategoryId.mockResolvedValue('cat_1');
      prisma.proService.findUnique.mockResolvedValue({ isActive: true });
      prisma.weeklyAvailability.findUnique.mockResolvedValue({
        isActive: true,
        startMin: 540, // 09:00
        endMin: 1080, // 18:00
      });
    }

    it('should return 409 SLOT_TAKEN when slot is already CONFIRMED', async () => {
      setupCreateMocks();

      // Simulate a CONFIRMED booking at 10:00
      const confirmedSlot = new Date(2026, 5, 15, 10, 0);
      prisma.booking.findMany.mockResolvedValue([
        { timeSlot: confirmedSlot, duration: 1 },
      ]);

      try {
        await service.createBooking('client_1', 'CLIENT', {
          proId: 'pro_1',
          categoryId: 'cat_1',
          date: futureDate,
          time: futureTime,
        });
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        expect(err.getResponse().code).toBe('SLOT_TAKEN');
      }
    });

    it('should create booking successfully when slot is free', async () => {
      setupCreateMocks();

      // No confirmed bookings
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.create.mockResolvedValue({
        id: 'booking_1',
        status: 'PENDING',
        timeSlot: new Date(2026, 5, 15, 10, 0),
        category: { id: 'cat_1', name: 'Plomberie' },
        pro: {
          user: { firstName: 'Ahmed', lastName: 'Ben' },
          city: { name: 'Casablanca' },
        },
      });

      const result = await service.createBooking('client_1', 'CLIENT', {
        proId: 'pro_1',
        categoryId: 'cat_1',
        date: futureDate,
        time: futureTime,
      });

      expect(result.status).toBe('PENDING');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  DECLINED — atomic transition
  // ═══════════════════════════════════════════════════════════════

  describe('updateBookingStatus — DECLINED', () => {
    it('should atomically decline a PENDING booking', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: 'DECLINED',
        timeSlot: new Date(),
        proId: 'pro_1',
        clientId: 'client_1',
      });

      const result = await service.updateBookingStatus(
        'b1', 'pro_1', 'PRO', { status: 'DECLINED' },
      );

      expect(result.status).toBe('DECLINED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', proId: 'pro_1', status: 'PENDING' },
        data: { status: 'DECLINED' },
      });
    });

    it('should return INVALID_STATUS_TRANSITION if booking already changed', async () => {
      // updateMany returns 0 — booking is no longer PENDING
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });
      prisma.booking.findUnique.mockResolvedValue({
        proId: 'pro_1',
        status: 'CONFIRMED', // changed by concurrent request
      });

      try {
        await service.updateBookingStatus(
          'b1', 'pro_1', 'PRO', { status: 'DECLINED' },
        );
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('INVALID_STATUS_TRANSITION');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  completeBooking — atomic + duration check
  // ═══════════════════════════════════════════════════════════════

  describe('completeBooking', () => {
    it('should complete a CONFIRMED booking after full duration elapsed', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      // timeSlot 4h ago, duration 3h → endTime 1h ago → complete OK
      const timeSlot = new Date(Date.now() - 4 * 60 * 60 * 1000);
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: 'COMPLETED',
        timeSlot,
        completedAt: new Date(),
        duration: 3,
      });

      const result = await service.completeBooking('b1', 'pro_1', 'PRO');

      expect(result.status).toBe('COMPLETED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should reject with TOO_EARLY_TO_COMPLETE if duration not elapsed', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      // timeSlot 1h ago, duration 3h → endTime 2h from now → TOO_EARLY
      const timeSlot = new Date(Date.now() - 1 * 60 * 60 * 1000);
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: 'COMPLETED',
        timeSlot,
        completedAt: new Date(),
        duration: 3,
      });
      prisma.booking.update.mockResolvedValue({}); // revert mock

      try {
        await service.completeBooking('b1', 'pro_1', 'PRO');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('TOO_EARLY_TO_COMPLETE');
      }
    });

    it('should return INVALID_STATUS_TRANSITION if not CONFIRMED', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });
      prisma.booking.findUnique.mockResolvedValue({
        proId: 'pro_1',
        status: 'PENDING',
      });

      try {
        await service.completeBooking('b1', 'pro_1', 'PRO');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('INVALID_STATUS_TRANSITION');
      }
    });

    it('should return INVALID_STATUS_TRANSITION on double complete', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });
      prisma.booking.findUnique.mockResolvedValue({
        proId: 'pro_1',
        status: 'COMPLETED', // already completed by concurrent request
      });

      try {
        await service.completeBooking('b1', 'pro_1', 'PRO');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('INVALID_STATUS_TRANSITION');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  cancelBooking — atomic
  // ═══════════════════════════════════════════════════════════════

  describe('cancelBooking', () => {
    it('should set CANCELLED_BY_CLIENT when timeSlot > 24h from now', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'CANCELLED_BY_CLIENT',
        timeSlot: futureDate,
      });

      const result = await service.cancelBooking('b1', 'client_1', 'CLIENT', {});
      expect(result.status).toBe('CANCELLED_BY_CLIENT');
    });

    it('should set CANCELLED_BY_CLIENT_LATE when timeSlot <= 24h from now', async () => {
      const soonDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b2',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'CANCELLED_BY_CLIENT',
        timeSlot: soonDate,
      });
      prisma.booking.update.mockResolvedValue({}); // late update mock

      const result = await service.cancelBooking('b2', 'client_1', 'CLIENT', {});
      expect(result.status).toBe('CANCELLED_BY_CLIENT_LATE');
    });

    it('should require reason for PRO cancellation', async () => {
      await expect(
        service.cancelBooking('b3', 'pro_1', 'PRO', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set CANCELLED_BY_PRO with valid reason', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b4',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'CANCELLED_BY_PRO',
        timeSlot: new Date(),
      });

      const result = await service.cancelBooking('b4', 'pro_1', 'PRO', {
        reason: 'Urgence personnelle',
      });
      expect(result.status).toBe('CANCELLED_BY_PRO');
    });

    it('should reject cancellation if booking is not CONFIRMED (INVALID_STATUS_TRANSITION)', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });
      prisma.booking.findUnique.mockResolvedValue({
        clientId: 'client_1',
        status: 'PENDING',
      });

      try {
        await service.cancelBooking('b5', 'client_1', 'CLIENT', {});
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('INVALID_STATUS_TRANSITION');
      }
    });

    it('should reject cancel + complete concurrent (INVALID_STATUS_TRANSITION)', async () => {
      // Simulate: cancel attempt after concurrent complete changed status to COMPLETED
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });
      prisma.booking.findUnique.mockResolvedValue({
        proId: 'pro_1',
        status: 'COMPLETED',
      });

      try {
        await service.cancelBooking('b6', 'pro_1', 'PRO', { reason: 'Test concurrent' });
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('INVALID_STATUS_TRANSITION');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  updateBooking (duration) — atomic
  // ═══════════════════════════════════════════════════════════════

  describe('updateBooking (duration)', () => {
    it('should atomically update duration for PENDING booking', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: 'WAITING_FOR_CLIENT',
        timeSlot: new Date(Date.now() + 24 * 60 * 60 * 1000),
        duration: 2,
        isModifiedByPro: true,
        clientId: 'client_1',
      });
      // No conflicting bookings for duration > 1
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.updateBooking('b1', 'pro_1', 'PRO', 2);

      expect(result.status).toBe('WAITING_FOR_CLIENT');
      expect(result.duration).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should reject with ALREADY_MODIFIED if isModifiedByPro is true', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });
      prisma.booking.findUnique.mockResolvedValue({
        proId: 'pro_1',
        status: 'PENDING',
        isModifiedByPro: true, // already modified
      });

      try {
        await service.updateBooking('b1', 'pro_1', 'PRO', 3);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('ALREADY_MODIFIED');
      }
    });

    it('should reject with INVALID_STATUS_TRANSITION if not PENDING', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });
      prisma.booking.findUnique.mockResolvedValue({
        proId: 'pro_1',
        status: 'CONFIRMED', // not PENDING
        isModifiedByPro: false,
      });

      try {
        await service.updateBooking('b1', 'pro_1', 'PRO', 2);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('INVALID_STATUS_TRANSITION');
      }
    });

    it('should reject with SLOT_CONFLICT when consecutive slots are occupied', async () => {
      // First call: updateMany succeeds
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      const futureSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // findUnique is called twice: once for timeSlot check, once for final return
      prisma.booking.findUnique
        .mockResolvedValueOnce({ timeSlot: futureSlot }) // first call: get timeSlot
        .mockResolvedValueOnce({ // second call: after revert
          id: 'b1',
          status: 'PENDING',
          timeSlot: futureSlot,
          duration: 1,
          isModifiedByPro: false,
          clientId: 'client_1',
        });

      // Conflicting booking in consecutive slot
      prisma.booking.findMany.mockResolvedValue([{ id: 'b2' }]);

      // Mock the revert update
      prisma.booking.update.mockResolvedValue({});

      try {
        await service.updateBooking('b1', 'pro_1', 'PRO', 3);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        expect(err.getResponse().code).toBe('SLOT_CONFLICT');
      }
    });
  });
});
