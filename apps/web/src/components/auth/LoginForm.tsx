'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { postJSON, APIError } from '@/lib/api';
import type { LoginInput, AuthResponse } from '@khadamat/contracts';

/**
 * LoginForm
 *
 * Formulaire de connexion
 * - Champs : Login (Email ou Phone), Password
 * - Appel API : POST /auth/login
 * - Success : setAuth() + redirect '/'
 * - Error : Affichage message d'erreur
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function LoginForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [formData, setFormData] = useState<LoginInput>({
    login: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await postJSON<AuthResponse>('/auth/login', formData);

      // Success : stocker auth et rediriger
      setAuth(response.user);
      router.push('/');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Champ Login */}
      <div>
        <label
          htmlFor="login"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Email ou Téléphone
        </label>
        <input
          type="text"
          id="login"
          value={formData.login}
          onChange={(e) =>
            setFormData({ ...formData, login: e.target.value })
          }
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
          placeholder="exemple@email.com ou 0612345678"
          required
        />
      </div>

      {/* Champ Password */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Mot de passe
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
          placeholder="••••••••"
          required
        />
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Bouton Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}
