'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { postJSON, APIError } from '@/lib/api';
import type { LoginInput, AuthResponse } from '@khadamat/contracts';

/**
 * Page : /auth/login
 *
 * Page de connexion modernisée avec Design System Khadamat
 * - Split screen (illustration + formulaire)
 * - Login hybride (email ou téléphone)
 */

export default function LoginPage() {
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
      setAuth(response.user, response.accessToken);

      // Redirect based on role
      if (response.user.role === 'PRO') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Identifiants invalides');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-600 p-12 flex-col justify-between">
        <div>
          <Link href="/" className="text-white text-2xl font-bold">
            Khadamat
          </Link>
        </div>

        <div className="text-white">
          <h1 className="text-4xl font-bold mb-4">
            Content de vous revoir !
          </h1>
          <p className="text-primary-100 text-lg">
            Connectez-vous pour accéder à votre espace et gérer vos services.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <p className="text-primary-100 text-sm">
            Connexion sécurisée avec vos identifiants
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-primary-500 text-2xl font-bold">
              Khadamat
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Connexion
          </h1>
          <p className="text-text-secondary mb-8">
            Accédez à votre compte Khadamat
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Login Field */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Email ou Téléphone
              </label>
              <input
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                placeholder="exemple@email.com ou 0612345678"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                placeholder="Votre mot de passe"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 bg-error-50 border border-error-500/20 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
                <p className="text-error-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 active:bg-primary-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-text-secondary mt-8">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-primary-500 font-medium hover:underline">
              S&apos;inscrire
            </Link>
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
