'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  ShieldCheck,
  CreditCard,
  Headphones,
  Send,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { postJSON } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterState = 'idle' | 'error' | 'submitting' | 'success' | 'confirmed' | 'already' | 'expired';

export default function Footer() {
  const { isAuthenticated, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<NewsletterState>('idle');

  // Handle confirmation redirect from backend (?newsletter=success|already|invalid|expired)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('newsletter');
    if (!status) return;

    switch (status) {
      case 'success':
        setNewsletterState('confirmed');
        break;
      case 'already':
        setNewsletterState('already');
        break;
      case 'expired':
      case 'invalid':
        setNewsletterState('expired');
        break;
    }

    // Clean URL
    window.history.replaceState({}, '', '/');
  }, []);

  const handleNewsletterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!EMAIL_REGEX.test(email)) {
        setNewsletterState('error');
        return;
      }
      setNewsletterState('submitting');
      try {
        await postJSON('/newsletter/subscribe', { email });
        setNewsletterState('success');
        setEmail('');
      } catch {
        setNewsletterState('error');
      }
    },
    [email],
  );

  const showAbonnement = !isAuthenticated || user?.role === 'PRO';

  return (
    <footer
      role="contentinfo"
      className="bg-surface border-t border-border mt-20 scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Grid 4 colonnes */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* ── Colonne A — Marque ── */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded-lg"
              aria-label="Khadamat — Accueil"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xl" aria-hidden="true">K</span>
              </div>
              <span className="text-2xl font-bold text-text-primary">Khadamat</span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              La plateforme marocaine des services de confiance.
            </p>
            <div className="flex items-center gap-3 text-text-muted text-xs">
              <span aria-hidden="true">Facebook</span>
              <span aria-hidden="true">Instagram</span>
              <span aria-hidden="true">LinkedIn</span>
            </div>
          </div>

          {/* ── Colonne B — Navigation ── */}
          <div>
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/pros"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Trouver un pro
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Blog
                </Link>
              </li>
              {showAbonnement && (
                <li>
                  <Link
                    href="/plans"
                    className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                  >
                    Abonnement
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* ── Colonne C — Aide ── */}
          <div>
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-4">
              Aide
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/#comment-ca-marche"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Comment ça marche
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@khadamat.ma"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Contact
                </a>
              </li>
              <li>
                <span aria-disabled="true" className="text-sm text-text-muted opacity-60 cursor-not-allowed select-none">
                  Centre d&apos;aide
                </span>
              </li>
              <li>
                <span aria-disabled="true" className="text-sm text-text-muted opacity-60 cursor-not-allowed select-none">
                  CGU
                </span>
              </li>
              <li>
                <span aria-disabled="true" className="text-sm text-text-muted opacity-60 cursor-not-allowed select-none">
                  Confidentialité
                </span>
              </li>
              <li>
                <span aria-disabled="true" className="text-sm text-text-muted opacity-60 cursor-not-allowed select-none">
                  Mentions légales
                </span>
              </li>
            </ul>
          </div>

          {/* ── Colonne D — Newsletter ── */}
          <div>
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-4">
              Recevez nos bons plans
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              1 e-mail par mois. Pas de spam.
            </p>

            <form onSubmit={handleNewsletterSubmit} noValidate>
              <div className="flex gap-2">
                <label htmlFor="footer-newsletter" className="sr-only">
                  Adresse e-mail
                </label>
                <input
                  id="footer-newsletter"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (newsletterState === 'error') setNewsletterState('idle');
                  }}
                  disabled={newsletterState === 'submitting' || newsletterState === 'success'}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={newsletterState === 'submitting' || newsletterState === 'success'}
                  aria-label="S'abonner à la newsletter"
                  className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">S&apos;abonner</span>
                </button>
              </div>

              {/* Status messages */}
              <div aria-live="polite" className="mt-2 min-h-[1.25rem]">
                {newsletterState === 'error' && (
                  <p className="flex items-center gap-1.5 text-xs text-error-600">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    Veuillez entrer un e-mail valide.
                  </p>
                )}
                {newsletterState === 'expired' && (
                  <p className="flex items-center gap-1.5 text-xs text-error-600">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    Le lien n&apos;est plus valide. Veuillez vous réinscrire.
                  </p>
                )}
                {newsletterState === 'success' && (
                  <p className="flex items-center gap-1.5 text-xs text-success-600">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    Merci ! Un e-mail de confirmation vous a été envoyé.
                  </p>
                )}
                {newsletterState === 'confirmed' && (
                  <p className="flex items-center gap-1.5 text-xs text-success-600">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    Votre inscription est confirmée. Merci !
                  </p>
                )}
                {newsletterState === 'already' && (
                  <p className="flex items-center gap-1.5 text-xs text-success-600">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    Vous étiez déjà inscrit(e).
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── Séparateur ── */}
        <div className="border-t border-border mt-12 pt-8">
          {/* Réassurance badges */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CreditCard className="w-5 h-5 text-primary-500" aria-hidden="true" />
              <span>Paiement sécurisé via Payzone</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <ShieldCheck className="w-5 h-5 text-primary-500" aria-hidden="true" />
              <span>Identité vérifiée (KYC)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Headphones className="w-5 h-5 text-primary-500" aria-hidden="true" />
              <span>Support 7j/7</span>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-text-muted text-sm text-center">
            &copy; {new Date().getFullYear()} Khadamat. Fait avec{' '}
            <Heart className="w-3 h-3 inline text-error-500 mx-0.5 fill-current" aria-hidden="true" />{' '}
            au Maroc.
          </p>
        </div>
      </div>
    </footer>
  );
}
