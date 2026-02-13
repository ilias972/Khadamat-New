import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../database/prisma.service';
import { CatalogResolverService } from './catalog-resolver.service';

describe('CatalogService', () => {
  let service: CatalogService;

  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    city: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
  };

  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  };

  const catalogResolver = {
    resolveCityId: jest.fn(),
    resolveCategoryId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: CatalogResolverService, useValue: catalogResolver },
      ],
    }).compile();

    service = module.get(CatalogService);
  });

  describe('getProsV2', () => {
    it('should filter pros by kycStatus APPROVED', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.getProsV2({});

      const findManyCall = prisma.user.findMany.mock.calls[0][0];
      expect(findManyCall.where.proProfile.is.kycStatus).toBe('APPROVED');
    });

    it('should combine kycStatus with city and category filters', async () => {
      catalogResolver.resolveCityId.mockResolvedValue('internal_city_1');
      catalogResolver.resolveCategoryId.mockResolvedValue('internal_cat_1');
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.getProsV2({ cityId: 'city_casa_001', categoryId: 'cat_plumb_001' });

      const findManyCall = prisma.user.findMany.mock.calls[0][0];
      expect(findManyCall.where.proProfile.is.kycStatus).toBe('APPROVED');
      expect(findManyCall.where.proProfile.is.cityId).toBe('internal_city_1');
    });
  });

  describe('getProDetail', () => {
    it('should return 404 for pro with kycStatus != APPROVED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        firstName: 'Test',
        lastName: 'Pro',
        phone: '0612345678',
        proProfile: {
          isPremium: false,
          kycStatus: 'PENDING',
          boostActiveUntil: null,
          city: { publicId: 'city_casa_001', name: 'Casablanca' },
          services: [],
        },
      });

      await expect(service.getProDetail('user_1')).rejects.toThrow('Pro introuvable');
    });
  });
});
