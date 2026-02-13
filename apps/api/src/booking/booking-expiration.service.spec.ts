import { Test, TestingModule } from '@nestjs/testing';
import { BookingExpirationService } from './booking-expiration.service';
import { PrismaService } from '../database/prisma.service';

describe('BookingExpirationService', () => {
  let service: BookingExpirationService;
  let prisma: {
    booking: { findMany: jest.Mock; updateMany: jest.Mock };
    bookingEvent: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
      bookingEvent: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingExpirationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(BookingExpirationService);
  });

  it('should expire bookings and persist events via createMany', async () => {
    const mockBookings = [{ id: 'b1' }, { id: 'b2' }];
    prisma.booking.findMany.mockResolvedValue(mockBookings);

    await service.expireBookings();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.booking.updateMany).toHaveBeenCalledTimes(1);
    const updateCall = prisma.booking.updateMany.mock.calls[0][0];
    expect(updateCall.where.id.in).toEqual(['b1', 'b2']);
    expect(updateCall.data.status).toBe('EXPIRED');

    // createMany called once with all events
    expect(prisma.bookingEvent.createMany).toHaveBeenCalledTimes(1);
    const createManyCall = prisma.bookingEvent.createMany.mock.calls[0][0];
    expect(createManyCall.data).toHaveLength(2);
    expect(createManyCall.data[0].bookingId).toBe('b1');
    expect(createManyCall.data[0].type).toBe('EXPIRED');
    expect(createManyCall.data[0].metadata).toEqual({ reason: 'AUTO_EXPIRE' });
    expect(createManyCall.data[1].bookingId).toBe('b2');
  });

  it('should not create transaction when no bookings to expire', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    await expect(service.expireBookings()).resolves.not.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
