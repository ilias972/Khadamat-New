import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
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
    },
    bookingEvent: {
      create: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
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

  describe('cancelBooking', () => {
    it('should set CANCELLED_BY_CLIENT when timeSlot > 24h from now', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'CONFIRMED',
        timeSlot: futureDate,
      });
      prisma.booking.update.mockResolvedValue({
        id: 'b1',
        status: 'CANCELLED_BY_CLIENT',
        timeSlot: futureDate,
      });

      const result = await service.cancelBooking('b1', 'client_1', 'CLIENT', {});
      expect(result.status).toBe('CANCELLED_BY_CLIENT');
      expect(prisma.bookingEvent.create).toHaveBeenCalledTimes(1);
    });

    it('should set CANCELLED_BY_CLIENT_LATE when timeSlot <= 24h from now', async () => {
      const soonDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b2',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'CONFIRMED',
        timeSlot: soonDate,
      });
      prisma.booking.update.mockResolvedValue({
        id: 'b2',
        status: 'CANCELLED_BY_CLIENT_LATE',
        timeSlot: soonDate,
      });

      const result = await service.cancelBooking('b2', 'client_1', 'CLIENT', {});
      expect(result.status).toBe('CANCELLED_BY_CLIENT_LATE');
    });

    it('should require reason for PRO cancellation', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b3',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'CONFIRMED',
        timeSlot: new Date(),
      });

      await expect(
        service.cancelBooking('b3', 'pro_1', 'PRO', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set CANCELLED_BY_PRO with valid reason', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b4',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'CONFIRMED',
        timeSlot: new Date(),
      });
      prisma.booking.update.mockResolvedValue({
        id: 'b4',
        status: 'CANCELLED_BY_PRO',
        timeSlot: new Date(),
      });

      const result = await service.cancelBooking('b4', 'pro_1', 'PRO', {
        reason: 'Urgence personnelle',
      });
      expect(result.status).toBe('CANCELLED_BY_PRO');
    });

    it('should reject cancellation if booking is not CONFIRMED', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b5',
        clientId: 'client_1',
        proId: 'pro_1',
        status: 'PENDING',
        timeSlot: new Date(),
      });

      await expect(
        service.cancelBooking('b5', 'client_1', 'CLIENT', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
