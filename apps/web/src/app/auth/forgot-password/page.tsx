'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import { postJSON, APIError } from '@/lib/api';

type PageState = 'form' | 'submitted';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+212|0)[5-7]\d{8}$/;

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const value = identifier.trim();
    if (!value) {
      setError('Veuillez saisir votre email ou numéro de téléphone.');
      return;
    }

    // Detect if email or phone
    const isEmail = value.includes('@');
    if (isEmail && !EMAIL_REGEX.test(value)) {
      setError('Format d\'email invalide.');
      return;
    }
    if (!isEmail && !PHONE_REGEX.test(value)) {
      setError('Numéro de téléphone marocain invalide (ex: 0612345678).');
      return;
    }

    setLoading(true);

    try {
      const payload = isEmail ? { email: value } : { phone: value };
      await postJSON('/auth/forgot-password', payload);
      setPageState('submitted');
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 motion-safe:transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour à la connexion
        </Link>

        {pageState === 'form' ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
                <KeyRound className="w-7 h-7 text-primary-500" aria-hidden="true" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Mot de passe oublié
              </h1>
              <p className="text-text-secondary">
                Saisissez votre email ou numéro de téléphone pour recevoir un lien de réinitialisation.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-semibold text-text-primary mb-2"
                >
                  Email ou Téléphone
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'forgot-password-error' : undefined}
                  className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 motion-safe:transition-all"
                  placeholder="exemple@email.com ou 0612345678"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {/* Error message */}
              {error && (
                <div
                  id="forgot-password-error"
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
                    Envoi en cours...
                  </span>
                ) : (
                  'Envoyer le lien de réinitialisation'
                )}
              </button>
            </form>
          </>
        ) : (
          /* Confirmation screen (always shown regardless of user existence) */
          <div className="text-center">
            <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-success-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-3">
              Demande envoyée
            </h1>
            <p className="text-text-secondary mb-8 leading-relaxed">
              Si un compte est associé à cet identifiant, vous recevrez
              un lien de réinitialisation. Vérifiez votre boîte de réception
              (et le dossier spam).
            </p>
            <p className="text-sm text-text-muted mb-8">
              Le lien expire dans 15 minutes.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 motion-safe:transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        )}

        {/* Register link */}
        {pageState === 'form' && (
          <p className="text-center text-text-secondary mt-8 text-sm">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-primary-500 font-semibold hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
