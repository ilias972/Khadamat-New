import { request as playwrightRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:3001';
const STORAGE_DIR = path.join(__dirname, '.auth');

/**
 * Global setup: logs in once per role and saves storage state (cookies)
 * to .auth/ directory. Tests reuse these via storageStatePath.
 */
async function globalSetup() {
  // Ensure storage dir exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Login client and save state
  const clientCtx = await playwrightRequest.newContext();
  const clientRes = await clientCtx.post(`${API_BASE}/api/auth/login`, {
    data: { login: '0612345678', password: 'Password1234' },
  });
  if (!clientRes.ok()) {
    throw new Error(`Client login failed: ${clientRes.status()} ${await clientRes.text()}`);
  }
  const clientData = await clientRes.json();
  await clientCtx.storageState({ path: path.join(STORAGE_DIR, 'client.json') });
  // Save user data for assertions
  fs.writeFileSync(
    path.join(STORAGE_DIR, 'client-user.json'),
    JSON.stringify(clientData.user),
  );
  await clientCtx.dispose();

  // Login pro and save state
  const proCtx = await playwrightRequest.newContext();
  const proRes = await proCtx.post(`${API_BASE}/api/auth/login`, {
    data: { login: '0651111111', password: 'Password1234' },
  });
  if (!proRes.ok()) {
    throw new Error(`Pro login failed: ${proRes.status()} ${await proRes.text()}`);
  }
  const proData = await proRes.json();
  await proCtx.storageState({ path: path.join(STORAGE_DIR, 'pro.json') });
  fs.writeFileSync(
    path.join(STORAGE_DIR, 'pro-user.json'),
    JSON.stringify(proData.user),
  );
  await proCtx.dispose();
}

export default globalSetup;
