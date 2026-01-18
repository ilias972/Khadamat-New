/**
 * API Helpers
 *
 * Fonctions utilitaires pour communiquer avec l'API backend
 * ⚠️ Utilise NEXT_PUBLIC_API_URL (défini dans .env.local)
 */

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
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

/**
 * POST JSON
 * Envoie une requête POST avec un body JSON
 *
 * @param endpoint - Endpoint relatif (ex: '/auth/login')
 * @param body - Corps de la requête
 * @param token - Token JWT optionnel (pour routes protégées)
 */
export async function postJSON<T = any>(
  endpoint: string,
  body: any,
  token?: string,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    // Extraire le message d'erreur du backend
    const message = data.message || `Erreur ${response.status}`;
    throw new APIError(
      Array.isArray(message) ? message.join(', ') : message,
      response.status,
      data,
    );
  }

  return data;
}

/**
 * GET JSON
 * Envoie une requête GET
 *
 * @param endpoint - Endpoint relatif (ex: '/auth/me')
 * @param token - Token JWT optionnel (pour routes protégées)
 */
export async function getJSON<T = any>(
  endpoint: string,
  token?: string,
): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers,
  });

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
