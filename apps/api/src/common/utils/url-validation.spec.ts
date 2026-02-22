import { BadRequestException } from '@nestjs/common';
import { validateUrl } from './url-validation';

describe('validateUrl', () => {
  // ═══════════════════════════════════════════════════════════════
  //  Valid URLs
  // ═══════════════════════════════════════════════════════════════

  it('should accept a valid https URL', () => {
    expect(validateUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('should accept https URL with path, query, and fragment', () => {
    expect(validateUrl('https://cdn.example.com/images/photo.jpg?w=200#top'))
      .toBe('https://cdn.example.com/images/photo.jpg?w=200#top');
  });

  it('should trim whitespace from valid URL', () => {
    expect(validateUrl('  https://example.com/a.png  ')).toBe('https://example.com/a.png');
  });

  // ═══════════════════════════════════════════════════════════════
  //  Invalid URLs — must throw INVALID_URL
  // ═══════════════════════════════════════════════════════════════

  const invalidCases: [string, unknown][] = [
    ['empty string', ''],
    ['whitespace only', '   '],
    ['javascript: protocol', 'javascript:alert(1)'],
    ['data: protocol', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['file: protocol', 'file:///etc/passwd'],
    ['blob: protocol', 'blob:http://example.com/uuid'],
    ['ftp: protocol', 'ftp://example.com/file.txt'],
    ['protocol-relative URL', '//example.com/a.png'],
    ['relative path', '/relative/path'],
    ['not a URL', 'not-a-url'],
    ['http: protocol (not allowed)', 'http://example.com/a.png'],
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['URL with credentials', 'https://user:pass@example.com/a.png'],
  ];

  for (const [label, value] of invalidCases) {
    it(`should reject ${label}`, () => {
      try {
        validateUrl(value);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('INVALID_URL');
      }
    });
  }

  it('should reject URL exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2040);
    try {
      validateUrl(longUrl);
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getResponse().code).toBe('INVALID_URL');
    }
  });
});
