import { APIRequestContext } from '@playwright/test';

// ─── Environment Variables ──────────────────────────────────────
const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:3001';

const CLIENT_PHONE = process.env.E2E_CLIENT_PHONE || '0612345678';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'Password1234';

const PRO_PHONE = process.env.E2E_PRO_PHONE || '0651111111';
const PRO_PASSWORD = process.env.E2E_PRO_PASSWORD || 'Password1234';

// ─── Types ──────────────────────────────────────────────────────
export interface AuthContext {
  user: {
    id: string;
    email: string | null;
    phone: string;
    firstName: string;
    lastName: string;
    role: string;
    [key: string]: unknown;
  };
}

// ─── Login helpers ──────────────────────────────────────────────

/**
 * Low-level login: POST /api/auth/login.
 * The backend sets httpOnly cookies (accessToken, refreshToken) via set-cookie.
 * Playwright's APIRequestContext automatically stores these cookies and
 * sends them on subsequent requests to the same origin.
 */
async function loginRaw(
  request: APIRequestContext,
  login: string,
  password: string,
): Promise<AuthContext> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { login, password },
  });

  if (!res.ok()) {
    throw new Error(`Login failed (${res.status()}): ${await res.text()}`);
  }

  const json = await res.json();

  return {
    user: json.user,
  };
}

export async function loginClient(request: APIRequestContext): Promise<AuthContext> {
  return loginRaw(request, CLIENT_PHONE, CLIENT_PASSWORD);
}

export async function loginPro(request: APIRequestContext): Promise<AuthContext> {
  return loginRaw(request, PRO_PHONE, PRO_PASSWORD);
}

// ─── Authenticated API request ──────────────────────────────────

/**
 * Make an API request using the same request context (cookies are auto-forwarded
 * by Playwright for the same origin since login set them via set-cookie).
 */
export async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
) {
  const url = `${API_BASE}${path}`;
  const opts: Record<string, unknown> = {};
  if (body !== undefined) {
    opts.data = body;
  }

  switch (method) {
    case 'GET':
      return request.get(url, opts);
    case 'POST':
      return request.post(url, opts);
    case 'PATCH':
      return request.patch(url, opts);
    case 'PUT':
      return request.put(url, opts);
    case 'DELETE':
      return request.delete(url, opts);
  }
}

// ─── Seed data helpers ──────────────────────────────────────────

/**
 * Get a pro publicId from the public catalog.
 * Returns the first pro's id (pro_...) from GET /api/public/pros.
 */
export async function getSeedProPublicId(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${API_BASE}/api/public/pros`);
  if (!res.ok()) {
    throw new Error(`Failed to fetch pros: ${res.status()}`);
  }
  const pros = await res.json();
  // API may return array directly or { data: [...] }
  const list = Array.isArray(pros) ? pros : pros.data;
  if (!list || list.length === 0) {
    throw new Error('No pros found in catalog');
  }
  const proId = list[0].id;
  if (!proId || !proId.startsWith('pro_')) {
    throw new Error(`Expected pro publicId starting with pro_, got: ${proId}`);
  }
  return proId;
}

/**
 * Get seed city and category publicIds from the public catalog.
 */
export async function getSeedCityAndCategory(request: APIRequestContext): Promise<{
  cityId: string;
  categoryId: string;
}> {
  const [citiesRes, categoriesRes] = await Promise.all([
    request.get(`${API_BASE}/api/public/cities`),
    request.get(`${API_BASE}/api/public/categories`),
  ]);

  if (!citiesRes.ok()) throw new Error(`Failed to fetch cities: ${citiesRes.status()}`);
  if (!categoriesRes.ok()) throw new Error(`Failed to fetch categories: ${categoriesRes.status()}`);

  const cities = await citiesRes.json();
  const categories = await categoriesRes.json();

  if (!cities.length) throw new Error('No cities found');
  if (!categories.length) throw new Error('No categories found');

  return {
    cityId: cities[0].id,
    categoryId: categories[0].id,
  };
}

export { API_BASE };
