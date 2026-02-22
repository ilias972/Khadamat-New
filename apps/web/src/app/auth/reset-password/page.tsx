'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { postJSON, APIError } from '@/lib/api';

type PageState = 'form' | 'success' | 'missing-token';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>(
    token ? 'form' : 'missing-token',
  );

  const validate = (): string | null => {
    if (newPassword.length < 10) {
      return 'Le mot de passe doit contenir au moins 10 caractères.';
    }
    if (!/[a-z]/.test(newPassword)) {
      return 'Le mot de passe doit contenir au moins une minuscule.';
    }
    if (!/[A-Z]/.test(newPassword)) {
      return 'Le mot de passe doit contenir au moins une majuscule.';
    }
    if (!/[0-9]/.test(newPassword)) {
      return 'Le mot de passe doit contenir au moins un chiffre.';
    }
    if (newPassword !== confirmPassword) {
      return 'Les mots de passe ne correspondent pas.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await postJSON('/auth/reset-password', {
        token,
        newPassword,
      });
      setPageState('success');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Missing token state
  if (pageState === 'missing-token') {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-error-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Lien invalide
        </h1>
        <p className="text-text-secondary mb-8">
          Ce lien de réinitialisation est invalide ou a expiré.
          Veuillez faire une nouvelle demande.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 motion-safe:transition-colors"
        >
          Nouvelle demande
        </Link>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Mot de passe mis à jour
        </h1>
        <p className="text-text-secondary mb-8">
          Votre mot de passe a été réinitialisé avec succès.
          Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 motion-safe:transition-colors"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  // Form state
  return (
    <div className="w-full max-w-md">
      {/* Back link */}
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 motion-safe:transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Retour à la connexion
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-primary-500" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Nouveau mot de passe
        </h1>
        <p className="text-text-secondary">
          Choisissez un nouveau mot de passe sécurisé pour votre compte.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* New password */}
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-semibold text-text-primary mb-2"
          >
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError('');
              }}
              aria-describedby={error ? 'reset-password-rules reset-password-error' : 'reset-password-rules'}
              aria-invalid={error ? 'true' : undefined}
              className="w-full px-4 py-3 pr-12 bg-surface border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 motion-safe:transition-all"
              placeholder="Minimum 10 caractères"
              autoComplete="new-password"
              autoFocus
            />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary motion-safe:transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
              {showPassword ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {/* Password requirements */}
          <ul id="reset-password-rules" className="mt-2 space-y-1 text-xs text-text-muted">
            <li className={newPassword.length >= 10 ? 'text-success-600' : ''}>
              10 caractères minimum
            </li>
            <li className={/[a-z]/.test(newPassword) ? 'text-success-600' : ''}>
              Une lettre minuscule
            </li>
            <li className={/[A-Z]/.test(newPassword) ? 'text-success-600' : ''}>
              Une lettre majuscule
            </li>
            <li className={/[0-9]/.test(newPassword) ? 'text-success-600' : ''}>
              Un chiffre
            </li>
          </ul>
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-semibold text-text-primary mb-2"
          >
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              aria-describedby={error ? 'reset-password-error' : undefined}
              aria-invalid={error ? 'true' : undefined}
              className="w-full px-4 py-3 pr-12 bg-surface border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 motion-safe:transition-all"
              placeholder="Retapez votre mot de passe"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary motion-safe:transition-colors"
              aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            id="reset-password-error"
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 bg-error-50 border border-error-200 rounded-xl p-4"
          >
            <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-error-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 active:bg-primary-700 motion-safe:transition-all motion-safe:duration-200 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 motion-safe:animate-spin" aria-hidden="true" />
              Réinitialisation...
            </span>
          ) : (
            'Réinitialiser le mot de passe'
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 motion-safe:animate-spin text-primary-500" aria-label="Chargement" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
