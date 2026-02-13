import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionExpirationService } from './subscription-expiration.service';
import { PrismaService } from '../database/prisma.service';

describe('SubscriptionExpirationService', () => {
  let service: SubscriptionExpirationService;
  let prisma: { proProfile: { updateMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      proProfile: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionExpirationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubscriptionExpirationService);
  });

  it('should expire premium subscriptions past premiumActiveUntil', async () => {
    prisma.proProfile.updateMany.mockResolvedValueOnce({ count: 2 });
    prisma.proProfile.updateMany.mockResolvedValueOnce({ count: 0 });

    await service.expireSubscriptions();

    const premiumCall = prisma.proProfile.updateMany.mock.calls[0][0];
    expect(premiumCall.where.isPremium).toBe(true);
    expect(premiumCall.where.premiumActiveUntil.lt).toBeInstanceOf(Date);
    expect(premiumCall.data.isPremium).toBe(false);
    expect(premiumCall.data.premiumActiveUntil).toBeNull();
  });

  it('should expire boosts past boostActiveUntil', async () => {
    prisma.proProfile.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.proProfile.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.expireSubscriptions();

    const boostCall = prisma.proProfile.updateMany.mock.calls[1][0];
    expect(boostCall.where.boostActiveUntil.lt).toBeInstanceOf(Date);
    expect(boostCall.data.boostActiveUntil).toBeNull();
  });

  it('should handle zero expired entries without error', async () => {
    await expect(service.expireSubscriptions()).resolves.not.toThrow();
    expect(prisma.proProfile.updateMany).toHaveBeenCalledTimes(2);
  });
});
