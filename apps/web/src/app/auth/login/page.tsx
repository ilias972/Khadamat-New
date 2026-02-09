'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      setAuth(response.user);

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
    <div className="min-h-screen flex">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL - Orange Vibrant Sidebar
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F08C1B] relative overflow-hidden">
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
      <div className="flex-1 bg-[#F2F0EF] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-[#F08C1B] text-2xl font-bold">
              Khadamat
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Connexion
            </h1>
            <p className="text-slate-500">
              Accédez à votre compte Khadamat
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Login Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email ou Téléphone
              </label>
              <input
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                placeholder="exemple@email.com ou 0612345678"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                placeholder="Votre mot de passe"
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-[#F08C1B] font-medium hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-[#F08C1B] text-white font-bold rounded-xl hover:bg-[#D97213] active:bg-[#C56510] transition-all duration-200 shadow-lg shadow-[#F08C1B]/25 hover:shadow-xl hover:shadow-[#F08C1B]/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#F2F0EF] text-slate-500">ou</span>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-slate-500">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-[#F08C1B] font-semibold hover:underline">
              S&apos;inscrire gratuitement
            </Link>
          </p>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
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
