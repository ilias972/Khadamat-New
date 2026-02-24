import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../database/prisma.service';
import { CatalogResolverService } from '../catalog/catalog-resolver.service';
import { PaymentOrderPlanType } from './types/prisma-enums';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

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
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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

  describe('initiatePayment idempotency', () => {
    it('should reuse an existing pending payment order for same pro and plan', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        userId: 'pro_1',
        isPremium: false,
        premiumActiveUntil: null,
        boostActiveUntil: null,
        user: { id: 'pro_1' },
      });

      const pendingOrder = {
        id: 'po_existing',
        oid: 'KHD-EXISTING-1',
        planType: 'PREMIUM_MONTHLY',
        status: 'PENDING',
        amountCents: 35000,
        pendingKey: 'pro_1:PREMIUM_MONTHLY',
      };

      prisma.paymentOrder.findFirst
        .mockResolvedValueOnce(pendingOrder) // legacyPending
        .mockResolvedValueOnce(pendingOrder); // normalizedPending by pendingKey

      const response = await service.initiatePayment('pro_1', {
        planType: PaymentOrderPlanType.PREMIUM_MONTHLY,
      });

      expect(prisma.paymentOrder.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
      expect(response.reusedPendingOrder).toBe(true);
      expect(response.order.reference).toBe('KHD-EXISTING-1');
      expect(response.order.status).toBe('PENDING');
    });

    it('should return amount from reused order amountCents (not plan config)', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        userId: 'pro_1',
        isPremium: false,
        premiumActiveUntil: null,
        boostActiveUntil: null,
        user: { id: 'pro_1' },
      });

      const pendingOrder = {
        id: 'po_existing',
        oid: 'KHD-EXISTING-2',
        planType: 'PREMIUM_MONTHLY',
        status: 'PENDING',
        amountCents: 42000,
        pendingKey: 'pro_1:PREMIUM_MONTHLY',
      };

      prisma.paymentOrder.findFirst
        .mockResolvedValueOnce(pendingOrder)
        .mockResolvedValueOnce(pendingOrder);

      const response = await service.initiatePayment('pro_1', {
        planType: PaymentOrderPlanType.PREMIUM_MONTHLY,
      });

      expect(response.reusedPendingOrder).toBe(true);
      expect(response.order.amount).toBe(420);
      expect(response.paymentInstructions.amount).toBe('420 MAD');
    });

    it('should be race-safe and reuse one pending order under parallel checkout calls', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        userId: 'pro_1',
        isPremium: false,
        premiumActiveUntil: null,
        boostActiveUntil: null,
        user: { id: 'pro_1' },
      });

      const createdOrder = {
        id: 'po_created',
        oid: 'KHD-CREATED-1',
        planType: 'PREMIUM_MONTHLY',
        status: 'PENDING',
        amountCents: 35000,
        pendingKey: 'pro_1:PREMIUM_MONTHLY',
      };

      prisma.paymentOrder.findFirst.mockImplementation((args: any) => {
        // legacy pending lookup => no existing order before create attempt
        if (!args?.where?.pendingKey) return Promise.resolve(null);
        // concurrent collision fallback lookup by pendingKey => reuse created order
        return Promise.resolve(createdOrder);
      });

      let createCallCount = 0;
      prisma.paymentOrder.create.mockImplementation(async () => {
        createCallCount += 1;
        if (createCallCount === 1) return createdOrder;

        const uniqueError: any = new Error('Unique constraint failed');
        uniqueError.code = 'P2002';
        throw uniqueError;
      });

      const [first, second] = await Promise.all([
        service.initiatePayment('pro_1', { planType: PaymentOrderPlanType.PREMIUM_MONTHLY }),
        service.initiatePayment('pro_1', { planType: PaymentOrderPlanType.PREMIUM_MONTHLY }),
      ]);

      expect(prisma.paymentOrder.create).toHaveBeenCalledTimes(2);
      expect(first.order.reference).toBe('KHD-CREATED-1');
      expect(second.order.reference).toBe('KHD-CREATED-1');
      expect([first.reusedPendingOrder, second.reusedPendingOrder]).toEqual(expect.arrayContaining([false, true]));
    });

    it('should reject premium checkout when premium is already active', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.proProfile.findUnique.mockResolvedValue({
        userId: 'pro_1',
        isPremium: true,
        premiumActiveUntil: futureDate,
        boostActiveUntil: null,
        user: { id: 'pro_1' },
      });

      await expect(
        service.initiatePayment('pro_1', {
          planType: PaymentOrderPlanType.PREMIUM_MONTHLY,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await service
        .initiatePayment('pro_1', {
          planType: PaymentOrderPlanType.PREMIUM_MONTHLY,
        })
        .catch((error: any) => {
          expect(error.getStatus()).toBe(403);
          expect(error.getResponse()).toMatchObject({ code: 'PREMIUM_ALREADY_ACTIVE' });
        });
    });

    it('should allow premium checkout when premium is inactive', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        userId: 'pro_1',
        isPremium: false,
        premiumActiveUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
        boostActiveUntil: null,
        user: { id: 'pro_1' },
      });

      const createdOrder = {
        id: 'po_created_2',
        oid: 'KHD-CREATED-2',
        planType: 'PREMIUM_MONTHLY',
        status: 'PENDING',
        amountCents: 35000,
        pendingKey: 'pro_1:PREMIUM_MONTHLY',
      };

      prisma.paymentOrder.findFirst.mockResolvedValue(null);
      prisma.paymentOrder.create.mockResolvedValue(createdOrder);

      const response = await service.initiatePayment('pro_1', {
        planType: PaymentOrderPlanType.PREMIUM_MONTHLY,
      });

      expect(response.success).toBe(true);
      expect(response.reusedPendingOrder).toBe(false);
      expect(response.order.reference).toBe('KHD-CREATED-2');
    });

    it('should block boost checkout when premiumActiveUntil is in the future even if isPremium is false', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        userId: 'pro_1',
        isPremium: false,
        premiumActiveUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        boostActiveUntil: null,
        user: { id: 'pro_1' },
      });
      catalogResolver.resolveCityId.mockResolvedValue('city_internal_1');
      catalogResolver.resolveCategoryId.mockResolvedValue('cat_internal_1');

      await expect(
        service.initiatePayment('pro_1', {
          planType: PaymentOrderPlanType.BOOST,
          cityId: 'city_casablanca_001',
          categoryId: 'cat_plomberie_001',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.proBoost.findFirst).not.toHaveBeenCalled();
      expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus ownership', () => {
    it('should return NotFound when order belongs to another user (no enumeration leak)', async () => {
      prisma.paymentOrder.findUnique.mockResolvedValue({
        id: 'po_foreign',
        oid: 'KHD-FOREIGN-1',
        proUserId: 'other_user',
        planType: 'PREMIUM_MONTHLY',
        amountCents: 35000,
        status: 'PENDING',
        createdAt: new Date(),
        paidAt: null,
      });

      await expect(service.getPaymentStatus('KHD-FOREIGN-1', 'pro_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should return NotFound when order does not exist', async () => {
      prisma.paymentOrder.findUnique.mockResolvedValue(null);
      await expect(service.getPaymentStatus('KHD-NOT-FOUND', 'pro_1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('plans & pending contract', () => {
    it('should expose payment plans from server source of truth', () => {
      const response = service.getPlans();
      expect(response.plans).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            planType: 'PREMIUM_MONTHLY',
            amount: 350,
            currency: 'MAD',
          }),
          expect.objectContaining({
            planType: 'PREMIUM_ANNUAL',
            amount: 3000,
            currency: 'MAD',
          }),
        ]),
      );
    });

    it('should return latest pending order for current user', async () => {
      const createdAt = new Date('2026-02-23T10:00:00.000Z');
      prisma.paymentOrder.findMany.mockResolvedValue([
        {
          id: 'po_pending',
          oid: 'KHD-PENDING-1',
          proUserId: 'pro_1',
          planType: 'PREMIUM_MONTHLY',
          amountCents: 35000,
          currency: 'MAD',
          status: 'PENDING',
          createdAt,
        },
      ]);

      const response = await service.getMyPendingOrder('pro_1');

      expect(response).toEqual({
        order: {
          reference: 'KHD-PENDING-1',
          planType: 'PREMIUM_MONTHLY',
          amount: 350,
          currency: 'MAD',
          createdAt,
        },
        orders: [
          {
            reference: 'KHD-PENDING-1',
            planType: 'PREMIUM_MONTHLY',
            amount: 350,
            currency: 'MAD',
            createdAt,
          },
        ],
      });
    });

    it('should expose all pending premium orders (not only one)', async () => {
      const latestCreatedAt = new Date('2026-02-23T12:00:00.000Z');
      const olderCreatedAt = new Date('2026-02-20T09:00:00.000Z');
      prisma.paymentOrder.findMany.mockResolvedValue([
        {
          id: 'po_pending_latest',
          oid: 'KHD-PENDING-ANNUAL',
          proUserId: 'pro_1',
          planType: 'PREMIUM_ANNUAL',
          amountCents: 300000,
          currency: 'MAD',
          status: 'PENDING',
          createdAt: latestCreatedAt,
        },
        {
          id: 'po_pending_older',
          oid: 'KHD-PENDING-MONTHLY',
          proUserId: 'pro_1',
          planType: 'PREMIUM_MONTHLY',
          amountCents: 35000,
          currency: 'MAD',
          status: 'PENDING',
          createdAt: olderCreatedAt,
        },
      ]);

      const response = await service.getMyPendingOrder('pro_1');

      expect(response.order).toEqual({
        reference: 'KHD-PENDING-ANNUAL',
        planType: 'PREMIUM_ANNUAL',
        amount: 3000,
        currency: 'MAD',
        createdAt: latestCreatedAt,
      });
      expect(response.orders).toEqual([
        {
          reference: 'KHD-PENDING-ANNUAL',
          planType: 'PREMIUM_ANNUAL',
          amount: 3000,
          currency: 'MAD',
          createdAt: latestCreatedAt,
        },
        {
          reference: 'KHD-PENDING-MONTHLY',
          planType: 'PREMIUM_MONTHLY',
          amount: 350,
          currency: 'MAD',
          createdAt: olderCreatedAt,
        },
      ]);
    });

    it('should return null when user has no pending order', async () => {
      prisma.paymentOrder.findMany.mockResolvedValue([]);
      await expect(service.getMyPendingOrder('pro_1')).resolves.toEqual({ order: null, orders: [] });
    });
  });
});
