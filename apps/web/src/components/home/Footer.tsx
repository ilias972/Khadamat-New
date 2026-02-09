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
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="text-text-muted hover:text-primary-500 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
              </a>
              <a href="#" aria-label="Instagram" className="text-text-muted hover:text-primary-500 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123s-.012 3.056-.06 4.122c-.049 1.064-.218 1.791-.465 2.428a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06s-3.056-.012-4.122-.06c-1.064-.049-1.791-.218-2.428-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.637-.416-1.363-.465-2.428C2.013 15.056 2 14.716 2 12s.013-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" /></svg>
              </a>
              <a href="#" aria-label="TikTok" className="text-text-muted hover:text-primary-500 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
              </a>
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
                <Link
                  href="/help"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Centre d&apos;aide
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cgu"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  CGU
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/mentions"
                  className="text-sm text-text-secondary hover:text-primary-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
                >
                  Mentions légales
                </Link>
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
              <span>Paiement direct entre client et professionnel</span>
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
