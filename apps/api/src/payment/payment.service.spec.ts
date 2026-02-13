import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../database/prisma.service';
import { CatalogResolverService } from '../catalog/catalog-resolver.service';

describe('PaymentService', () => {
  let service: PaymentService;

  // Deep mock of Prisma with transaction support
  const mockTx = {
    proBoost: { create: jest.fn() },
    proProfile: { update: jest.fn() },
    proSubscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'sub_1' }),
      update: jest.fn(),
    },
  };

  const prisma = {
    proProfile: {
      findUnique: jest.fn(),
    },
    proBoost: {
      findFirst: jest.fn(),
    },
    paymentOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    city: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  };

  const catalogResolver = {
    resolveCityId: jest.fn(),
    resolveCategoryId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: CatalogResolverService, useValue: catalogResolver },
      ],
    }).compile();

    service = module.get(PaymentService);
  });

  describe('activatePlan (via confirmPayment)', () => {
    it('should use endedAt (not endDate) when creating Premium subscription', async () => {
      const mockOrder = {
        oid: 'KHD-123',
        proUserId: 'user_1',
        planType: 'PREMIUM_MONTHLY',
        amountCents: 35000,
        status: 'PENDING',
      };

      prisma.paymentOrder.findUnique.mockResolvedValue(mockOrder);
      prisma.paymentOrder.update.mockResolvedValue({ ...mockOrder, status: 'PAID' });
      mockTx.proSubscription.findFirst.mockResolvedValue(null);
      mockTx.proSubscription.create.mockResolvedValue({ id: 'sub_1' });
      mockTx.proProfile.update.mockResolvedValue({});

      await service.confirmPayment('KHD-123', 'test');

      // Verify ProSubscription.create was called with endedAt, not endDate
      const createCall = mockTx.proSubscription.create.mock.calls[0][0];
      expect(createCall.data).toHaveProperty('endedAt');
      expect(createCall.data).not.toHaveProperty('endDate');
      expect(createCall.data.endedAt).toBeInstanceOf(Date);
    });
  });
});
