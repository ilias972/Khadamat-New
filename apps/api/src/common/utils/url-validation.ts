import { BadRequestException } from '@nestjs/common';

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(['https:']);

/**
 * Validates a URL string for safe storage.
 *
 * Rules:
 * - Must be a non-empty string
 * - Max 2048 characters
 * - Must be a valid absolute URL (parseable by `new URL()`)
 * - Only `https:` protocol allowed
 * - No embedded credentials (username/password)
 *
 * @throws BadRequestException with code INVALID_URL
 */
export function validateUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException({
      message: 'URL invalide',
      code: 'INVALID_URL',
    });
  }

  const trimmed = value.trim();

  if (trimmed.length > MAX_URL_LENGTH) {
    throw new BadRequestException({
      message: 'URL invalide',
      code: 'INVALID_URL',
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new BadRequestException({
      message: 'URL invalide',
      code: 'INVALID_URL',
    });
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new BadRequestException({
      message: 'URL invalide',
      code: 'INVALID_URL',
    });
  }

  if (parsed.username || parsed.password) {
    throw new BadRequestException({
      message: 'URL invalide',
      code: 'INVALID_URL',
    });
  }

  return trimmed;
}
