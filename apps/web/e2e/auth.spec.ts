import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE } from './fixtures';

const AUTH_DIR = path.join(__dirname, '.auth');

test.describe('Auth — publicId & session', () => {
  let clientUser: any;
  let proUser: any;
  let clientCtx: APIRequestContext;

  test.beforeAll(async () => {
    // Read user data saved by global setup (no login call needed)
    clientUser = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'client-user.json'), 'utf-8'));
    proUser = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'pro-user.json'), 'utf-8'));

    // Create context with stored client cookies
    const clientState = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, 'client.json'), 'utf-8'));
    clientCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'client.json') });
  });

  test.afterAll(async () => {
    await clientCtx?.dispose();
  });

  test('login client returns user.id starting with usr_', async () => {
    expect(clientUser.id).toMatch(/^usr_[0-9a-f]{32}$/);
  });

  test('login client user.id does NOT look like a cuid', async () => {
    expect(clientUser.id).not.toMatch(/^c[a-z0-9]{24}$/);
    expect(clientUser.id).not.toMatch(/^clk/);
    expect(clientUser.id).not.toMatch(/^cml/);
  });

  test('login pro returns user.id starting with usr_', async () => {
    expect(proUser.id).toMatch(/^usr_[0-9a-f]{32}$/);
  });

  test('GET /api/auth/me with valid cookies returns 200', async () => {
    const res = await clientCtx.get(`${API_BASE}/api/auth/me`);
    expect(res.status()).toBe(200);
    const user = await res.json();
    expect(user.id).toMatch(/^usr_/);
  });

  test('GET /api/auth/me without cookies returns 401', async () => {
    const anonCtx = await playwrightRequest.newContext();
    try {
      const res = await anonCtx.get(`${API_BASE}/api/auth/me`);
      expect(res.status()).toBe(401);
    } finally {
      await anonCtx.dispose();
    }
  });
});
