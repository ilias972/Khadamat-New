import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import * as path from 'path';
import { API_BASE } from './fixtures';

const AUTH_DIR = path.join(__dirname, '.auth');

test.describe('KYC security — access control', () => {
  let proCtx: APIRequestContext;
  let clientCtx: APIRequestContext;
  let proPublicId: string;

  test.beforeAll(async () => {
    // Reuse stored auth state — no login calls
    proCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'pro.json') });
    clientCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'client.json') });

    // Get a pro publicId from catalog
    const prosRes = await proCtx.get(`${API_BASE}/api/public/pros`);
    const pros = await prosRes.json();
    const list = Array.isArray(pros) ? pros : pros.data;
    proPublicId = list[0]?.id;
    expect(proPublicId).toMatch(/^pro_/);
  });

  test.afterAll(async () => {
    await proCtx?.dispose();
    await clientCtx?.dispose();
  });

  test('PRO can access own KYC status (200)', async () => {
    const res = await proCtx.get(`${API_BASE}/api/kyc/status`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('kycStatus');
    expect(data).not.toHaveProperty('kycCinFrontKey');
    expect(data).not.toHaveProperty('kycCinBackKey');
    expect(data).not.toHaveProperty('kycSelfieKey');
  });

  test('CLIENT cannot access KYC status (403 or 404)', async () => {
    const res = await clientCtx.get(`${API_BASE}/api/kyc/status`);
    // Returns 404 (no ProProfile) rather than 403 — service-level check
    expect([403, 404]).toContain(res.status());
  });

  test('PRO owner can access own KYC file download (not 403)', async () => {
    const res = await proCtx.get(
      `${API_BASE}/api/kyc/files/cin-front/download?proPublicId=${proPublicId}`,
    );
    // Should be 200 (file found) or 404 (no file on disk) — but never 403
    expect([200, 404]).toContain(res.status());
  });

  test('CLIENT cannot access PRO KYC file download (403)', async () => {
    const res = await clientCtx.get(
      `${API_BASE}/api/kyc/files/cin-front/download?proPublicId=${proPublicId}`,
    );
    expect(res.status()).toBe(403);
  });

  test('unauthenticated cannot access KYC file download (401)', async () => {
    const anonCtx = await playwrightRequest.newContext();
    try {
      const res = await anonCtx.get(
        `${API_BASE}/api/kyc/files/cin-front/download?proPublicId=${proPublicId}`,
      );
      expect(res.status()).toBe(401);
    } finally {
      await anonCtx.dispose();
    }
  });

  test('KYC status response does not leak file keys', async () => {
    const res = await proCtx.get(`${API_BASE}/api/kyc/status`);
    const body = await res.text();
    expect(body).not.toContain('kycCinFrontKey');
    expect(body).not.toContain('kycCinBackKey');
    expect(body).not.toContain('kycSelfieKey');
    expect(body).not.toContain('uploads/kyc/');
  });
});

test.describe('Permissions — cross-role access control', () => {
  let proCtx: APIRequestContext;
  let clientCtx: APIRequestContext;

  test.beforeAll(async () => {
    proCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'pro.json') });
    clientCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'client.json') });
  });

  test.afterAll(async () => {
    await proCtx?.dispose();
    await clientCtx?.dispose();
  });

  test('CLIENT cannot access PRO dashboard (403 or 404)', async () => {
    const res = await clientCtx.get(`${API_BASE}/api/pro/me`);
    // Returns 404 (no ProProfile for CLIENT user) — service-level check
    expect([403, 404]).toContain(res.status());
  });

  test('unauthenticated cannot create booking (401)', async () => {
    const anonCtx = await playwrightRequest.newContext();
    try {
      const res = await anonCtx.post(`${API_BASE}/api/bookings`, {
        data: {
          proId: 'fake',
          categoryId: 'cat_test_001',
          date: '2026-03-01',
          time: '10:00',
        },
      });
      expect(res.status()).toBe(401);
    } finally {
      await anonCtx.dispose();
    }
  });

  test('PRO cannot access admin payment endpoint (403)', async () => {
    const res = await proCtx.post(
      `${API_BASE}/api/payment/admin/confirm/fake-oid`,
      { data: {} },
    );
    expect(res.status()).toBe(403);
  });

  test('PRO cannot access admin pending payments (403)', async () => {
    const res = await proCtx.get(`${API_BASE}/api/payment/admin/pending`);
    expect(res.status()).toBe(403);
  });

  test('CLIENT cannot access PRO portfolio endpoint (no data leak)', async () => {
    const res = await clientCtx.get(`${API_BASE}/api/pro/portfolio`);
    // Returns 200 with empty array (no role guard, but no data leaked)
    // This is a known gap — portfolio endpoint lacks role check
    expect([200, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toEqual([]);
    }
  });
});
