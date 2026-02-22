import { getPagination, getPaginationMeta } from './pagination';

describe('Pagination utilities', () => {
  describe('getPagination', () => {
    it('should return skip=0, take=20 for page=1, limit=20', () => {
      expect(getPagination(1, 20)).toEqual({ skip: 0, take: 20 });
    });

    it('should return skip=5, take=5 for page=2, limit=5', () => {
      expect(getPagination(2, 5)).toEqual({ skip: 5, take: 5 });
    });

    it('should return skip=40, take=10 for page=5, limit=10', () => {
      expect(getPagination(5, 10)).toEqual({ skip: 40, take: 10 });
    });
  });

  describe('getPaginationMeta', () => {
    it('should compute correct meta for first page', () => {
      const meta = getPaginationMeta(1, 20, 50);
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should compute correct meta for middle page', () => {
      const meta = getPaginationMeta(2, 20, 50);
      expect(meta).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should compute correct meta for last page', () => {
      const meta = getPaginationMeta(3, 20, 50);
      expect(meta).toEqual({
        page: 3,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should handle zero results', () => {
      const meta = getPaginationMeta(1, 20, 0);
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle exact page boundary', () => {
      const meta = getPaginationMeta(2, 10, 20);
      expect(meta).toEqual({
        page: 2,
        limit: 10,
        total: 20,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      });
    });
  });
});
