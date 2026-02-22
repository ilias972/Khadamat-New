'use client';

import { Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, AlertCircle, Shield, Clock, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { postJSON, APIError } from '@/lib/api';
import type { LoginInput, AuthResponse } from '@khadamat/contracts';

/**
 * Page : /auth/login
 *
 * Page de connexion modernisée - TaskRabbit Style
 * Design chaleureux avec Orange (#F08C1B) et Beige (#F2F0EF)
 */

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const [formData, setFormData] = useState<LoginInput>({
    login: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await postJSON<AuthResponse>('/auth/login', formData);
      setAuth(response.user);

      // Redirect to ?next= destination if valid, otherwise role-based default
      const next = searchParams.get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        router.push(next);
      } else if (response.user.role === 'PRO') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err) {
      const msg = err instanceof APIError ? err.message : 'Identifiants invalides';
      setError(msg);
      // Focus error zone for screen readers, then focus first field
      requestAnimationFrame(() => {
        errorRef.current?.focus();
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL - Orange Vibrant Sidebar
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-48 h-48 border-4 border-white rounded-full" />
          <div className="absolute top-1/3 left-10 w-32 h-32 border-4 border-white rounded-full" />
          <div className="absolute bottom-32 right-1/4 w-24 h-24 border-4 border-white rounded-full" />
          <div className="absolute bottom-10 left-20 w-40 h-40 border-4 border-white rounded-full" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <Link href="/" className="text-white text-3xl font-bold tracking-tight">
              Khadamat
            </Link>
          </div>

          {/* Main Content - Centered */}
          <div className="flex-1 flex flex-col justify-center items-center text-center px-8">
            {/* Welcome Message */}
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
              <LogIn className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Content de vous revoir !
            </h1>
            <p className="text-white/90 text-xl max-w-sm">
              Connectez-vous pour accéder à votre espace et gérer vos services.
            </p>

            {/* Features */}
            <div className="mt-12 space-y-4 text-left w-full max-w-sm">
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-medium">Connexion 100% sécurisée</span>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-medium">Accès instantané à vos données</span>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-medium">Gérez vos réservations facilement</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="text-center">
            <p className="text-white/80 text-sm">
              La plateforme N°1 des services au Maroc
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL - Beige Form Section
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 bg-background flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-primary-500 text-2xl font-bold">
              Khadamat
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Connexion
            </h1>
            <p className="text-text-muted">
              Accédez à votre compte Khadamat
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error Message */}
            <div aria-live="assertive" aria-atomic="true">
              {error && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="flex items-start gap-3 bg-error-50 border border-error-200 rounded-xl p-4 outline-none"
                >
                  <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-error-700 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Login Field */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-text-label mb-2">
                Email ou Téléphone
              </label>
              <input
                ref={loginRef}
                id="login-email"
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? 'login-global-error' : undefined}
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 motion-safe:transition-all"
                placeholder="exemple@email.com ou 0612345678"
                required
                autoComplete="username"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-text-label mb-2">
                Mot de passe
              </label>
              <input
                id="login-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                aria-invalid={!!error || undefined}
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 motion-safe:transition-all"
                placeholder="Votre mot de passe"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary-500 font-medium hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 active:bg-primary-700 motion-safe:transition-all motion-safe:duration-200 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 motion-safe:hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="motion-safe:animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-strong"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-text-muted">ou</span>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-text-muted">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-primary-500 font-semibold hover:underline">
              S&apos;inscrire gratuitement
            </Link>
          </p>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
