/**
 * API Helpers
 *
 * Fonctions utilitaires pour communiquer avec l'API backend.
 * - Cookies httpOnly pour l'authentification (credentials: 'include')
 * - Header CSRF sur chaque requête authentifiée
 * - Auto-refresh transparent sur 401
 * - Cache mémoire pour endpoints quasi-statiques
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001/api'
    );
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
}

const baseUrl = getApiBaseUrl();

/* ─── Classe d'erreur API ─── */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/* ─── Memory cache pour endpoints statiques ─── */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const memoryCache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string): T | null {
  const entry = memoryCache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  memoryCache[key] = { data, ts: Date.now() };
}

/** Endpoints éligibles au cache mémoire */
const CACHEABLE_ENDPOINTS = ['/public/cities', '/public/categories'];

/** Endpoints publics — pas de credentials ni CSRF (évite preflight CORS inutile) */
const PUBLIC_ENDPOINTS = ['/public/cities', '/public/categories', '/public/pros', '/public/stats'];

/* ─── Refresh logic ─── */

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-PROTECTION': '1' },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* ─── Base fetcher ─── */

const RETRY_HEADER = 'x-retry';

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

function isPublicUrl(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((ep) => url.includes(ep));
}

async function baseFetch(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const isPublic = isPublicUrl(url);

  const mergedHeaders: Record<string, string> = {
    ...(isPublic ? {} : { 'Content-Type': 'application/json', 'X-CSRF-PROTECTION': '1' }),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    credentials: isPublic ? 'omit' : 'include',
    headers: mergedHeaders,
  });

  // Auto-refresh sur 401 (une seule tentative, jamais sur endpoints publics)
  if (!isPublic && res.status === 401 && !mergedHeaders[RETRY_HEADER]) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return baseFetch(url, {
        ...options,
        headers: { ...mergedHeaders, [RETRY_HEADER]: '1' },
      });
    }
  }

  return res;
}

/* ─── Helpers pour extraire les erreurs ─── */

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const message = data.message || `Erreur ${response.status}`;
    throw new APIError(
      Array.isArray(message) ? message.join(', ') : message,
      response.status,
      data,
    );
  }

  return data;
}

/* ─── Fonctions publiques ─── */

export async function getJSON<T = any>(endpoint: string): Promise<T> {
  if (CACHEABLE_ENDPOINTS.includes(endpoint)) {
    const cached = getCached<T>(endpoint);
    if (cached) return cached;
  }

  const response = await baseFetch(`${baseUrl}${endpoint}`, { method: 'GET' });
  const data = await parseResponse<T>(response);

  if (CACHEABLE_ENDPOINTS.includes(endpoint)) {
    setCache(endpoint, data);
  }

  return data;
}

export async function postJSON<T = any>(endpoint: string, body: any): Promise<T> {
  const response = await baseFetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function patchJSON<T = any>(endpoint: string, body: any): Promise<T> {
  const response = await baseFetch(`${baseUrl}${endpoint}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function putJSON<T = any>(endpoint: string, body: any): Promise<T> {
  const response = await baseFetch(`${baseUrl}${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function deleteJSON<T = any>(endpoint: string): Promise<T> {
  const response = await baseFetch(`${baseUrl}${endpoint}`, {
    method: 'DELETE',
  });
  return parseResponse<T>(response);
}

/**
 * POST FormData (multipart) — for file uploads.
 * Does NOT set Content-Type (browser sets multipart boundary automatically).
 */
export async function postFormData<T = any>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-PROTECTION': '1' },
    body: formData,
  });
  return parseResponse<T>(response);
}
