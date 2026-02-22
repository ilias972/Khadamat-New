import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycService } from './kyc.service';
import { PrismaService } from '../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ═══════════════════════════════════════════════════════════════
//  Fixtures: minimal valid file headers (magic bytes)
// ═══════════════════════════════════════════════════════════════

/** Minimal JPEG: FF D8 FF E0 ... */
const JPEG_HEADER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

/** Minimal PNG: 89 50 4E 47 0D 0A 1A 0A */
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

/** Spoofed file: ZIP header pretending to be image */
const ZIP_HEADER = Buffer.from([
  0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
]);

function createTempFile(content: Buffer, ext: string): string {
  const tmpDir = os.tmpdir();
  const filename = `test-kyc-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filepath = path.join(tmpDir, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
}

function makeMulterFile(
  filepath: string,
  mimetype = 'image/jpeg',
): Express.Multer.File {
  return {
    fieldname: 'cinFront',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype,
    size: fs.statSync(filepath).size,
    destination: path.dirname(filepath),
    filename: path.basename(filepath),
    path: filepath,
    buffer: Buffer.alloc(0),
    stream: null as any, // not used in validateMagicBytes
  };
}

// ═══════════════════════════════════════════════════════════════
//  Test Suite
// ═══════════════════════════════════════════════════════════════

describe('KycService — Submit', () => {
  let service: KycService;
  let tempFiles: string[] = [];

  const VALID_SALT = 'a-very-secure-salt-that-is-at-least-32-characters-long!!';

  const prisma = {
    proProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    kycAccessLog: {
      create: jest.fn().mockReturnValue({ catch: jest.fn() }),
    },
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'CIN_HASH_SALT') return VALID_SALT;
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(KycService);
  });

  afterEach(() => {
    // Clean up temp files
    for (const f of tempFiles) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* already deleted */
      }
    }
    tempFiles = [];
  });

  // ═══════════════════════════════════════════════════════════════
  //  1. Happy path: NOT_SUBMITTED + valid files → PENDING
  // ═══════════════════════════════════════════════════════════════

  describe('submitKyc — happy path', () => {
    it('should set kycStatus to PENDING for NOT_SUBMITTED profile', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        kycStatus: 'NOT_SUBMITTED',
      });
      prisma.proProfile.findFirst.mockResolvedValue(null); // no CIN conflict
      prisma.proProfile.update.mockResolvedValue({
        userId: 'user_1',
        kycStatus: 'PENDING',
      });

      const result = await service.submitKyc('user_1', {
        cinNumber: 'AB123456',
        frontKey: 'front-uuid.jpg',
        backKey: 'back-uuid.jpg',
      });

      expect(result.kycStatus).toBe('PENDING');
      expect(result.hasCinFront).toBe(true);
      expect(result.hasCinBack).toBe(true);

      // Verify update was called with hashed CIN
      const updateCall = prisma.proProfile.update.mock.calls[0][0];
      expect(updateCall.data.cinHash).toMatch(/^[a-f0-9]{64}$/);
      expect(updateCall.data.kycCinFrontKey).toBe('front-uuid.jpg');
      expect(updateCall.data.kycCinBackKey).toBe('back-uuid.jpg');
      expect(updateCall.data.kycStatus).toBe('PENDING');
      expect(updateCall.data.kycRejectionReason).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  2. Missing cinFront → CIN_FRONT_REQUIRED (controller-level,
  //     tested via service status guards here)
  // ═══════════════════════════════════════════════════════════════

  // Note: CIN_FRONT_REQUIRED is thrown in the controller, not the service.
  // This test verifies the service rejects when profile not found.
  describe('submitKyc — profile not found', () => {
    it('should throw NotFoundException if no ProProfile exists', async () => {
      prisma.proProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.submitKyc('user_999', {
          cinNumber: 'AB123456',
          frontKey: 'f.jpg',
          backKey: 'b.jpg',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  3. Spoofed type (magic bytes) → KYC_FILE_SPOOFED_TYPE
  // ═══════════════════════════════════════════════════════════════

  describe('validateMagicBytes', () => {
    it('should accept valid JPEG file', () => {
      const filepath = createTempFile(JPEG_HEADER, '.jpg');
      tempFiles.push(filepath);
      const file = makeMulterFile(filepath);

      expect(() => service.validateMagicBytes(file)).not.toThrow();
    });

    it('should accept valid PNG file', () => {
      const filepath = createTempFile(PNG_HEADER, '.png');
      tempFiles.push(filepath);
      const file = makeMulterFile(filepath, 'image/png');

      expect(() => service.validateMagicBytes(file)).not.toThrow();
    });

    it('should reject ZIP file masquerading as image', () => {
      const filepath = createTempFile(ZIP_HEADER, '.jpg');
      tempFiles.push(filepath);
      const file = makeMulterFile(filepath);

      try {
        service.validateMagicBytes(file);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = err.getResponse();
        expect(response.code).toBe('KYC_FILE_SPOOFED_TYPE');
      }
    });

    it('should reject plain text file with image extension', () => {
      const filepath = createTempFile(
        Buffer.from('This is not an image file at all'),
        '.jpg',
      );
      tempFiles.push(filepath);
      const file = makeMulterFile(filepath);

      try {
        service.validateMagicBytes(file);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = err.getResponse();
        expect(response.code).toBe('KYC_FILE_SPOOFED_TYPE');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  4. CIN already used → 409 CIN_ALREADY_USED
  // ═══════════════════════════════════════════════════════════════

  describe('submitKyc — CIN uniqueness', () => {
    it('should reject with CIN_ALREADY_USED if cinHash already exists', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        kycStatus: 'NOT_SUBMITTED',
      });
      prisma.proProfile.findFirst.mockResolvedValue({
        userId: 'other_user',
      }); // CIN conflict!

      try {
        await service.submitKyc('user_1', {
          cinNumber: 'AB123456',
          frontKey: 'f.jpg',
          backKey: 'b.jpg',
        });
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        const response = err.getResponse();
        expect(response.code).toBe('CIN_ALREADY_USED');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  5. Submit when REJECTED → KYC_USE_RESUBMIT
  // ═══════════════════════════════════════════════════════════════

  describe('submitKyc — status guards', () => {
    it('should reject with KYC_USE_RESUBMIT when status is REJECTED', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        kycStatus: 'REJECTED',
      });

      try {
        await service.submitKyc('user_1', {
          cinNumber: 'AB123456',
          frontKey: 'f.jpg',
          backKey: 'b.jpg',
        });
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = err.getResponse();
        expect(response.code).toBe('KYC_USE_RESUBMIT');
      }
    });

    it('should reject with KYC_ALREADY_PENDING when status is PENDING', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        kycStatus: 'PENDING',
      });

      try {
        await service.submitKyc('user_1', {
          cinNumber: 'AB123456',
          frontKey: 'f.jpg',
          backKey: 'b.jpg',
        });
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = err.getResponse();
        expect(response.code).toBe('KYC_ALREADY_PENDING');
      }
    });

    it('should reject with KYC_ALREADY_APPROVED when status is APPROVED', async () => {
      prisma.proProfile.findUnique.mockResolvedValue({
        kycStatus: 'APPROVED',
      });

      try {
        await service.submitKyc('user_1', {
          cinNumber: 'AB123456',
          frontKey: 'f.jpg',
          backKey: 'b.jpg',
        });
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const response = err.getResponse();
        expect(response.code).toBe('KYC_ALREADY_APPROVED');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  6. No CIN_HASH_SALT → API refuses to start
  // ═══════════════════════════════════════════════════════════════

  describe('CIN_HASH_SALT startup validation', () => {
    it('should throw at module init if CIN_HASH_SALT is missing', async () => {
      const badConfig = {
        get: jest.fn(() => undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            KycService,
            { provide: PrismaService, useValue: prisma },
            { provide: ConfigService, useValue: badConfig },
          ],
        }).compile(),
      ).rejects.toThrow('FATAL: CIN_HASH_SALT is missing or too weak');
    });

    it('should throw at module init if CIN_HASH_SALT is too short (< 32 chars)', async () => {
      const badConfig = {
        get: jest.fn(() => 'short-salt'),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            KycService,
            { provide: PrismaService, useValue: prisma },
            { provide: ConfigService, useValue: badConfig },
          ],
        }).compile(),
      ).rejects.toThrow('FATAL: CIN_HASH_SALT is missing or too weak');
    });
  });
});
