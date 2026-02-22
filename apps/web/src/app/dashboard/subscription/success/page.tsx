'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { getJSON } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { PublicUser } from '@khadamat/contracts';

// Types pour la réponse API
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

interface PaymentStatusResponse {
  oid: string;
  status: PaymentStatus;
  planType: string;
  amount: number;
}

/**
 * SubscriptionSuccessContent
 * Composant interne qui utilise useSearchParams.
 */
function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const oid = searchParams.get('oid');
  const { setUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null);

  // Vérification du paiement côté serveur
  useEffect(() => {
    if (!oid) {
      setLoading(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await getJSON<PaymentStatusResponse>(`/payment/status/${oid}`);
        setPaymentStatus(response);

        // Si PAID, rafraîchir le store auth via GET /pro/me
        if (response.status === 'PAID') {
          try {
            const updatedUser = await getJSON<PublicUser>('/pro/me');
            setUser(updatedUser);
          } catch (err) {
            console.error('Failed to refresh user:', err);
            // Non-bloquant : on continue d'afficher le succès
          }
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [oid, setUser]);

  // Confetti effect (emoji animation) - uniquement si PAID et motion autorisé
  useEffect(() => {
    if (!paymentStatus || paymentStatus.status !== 'PAID') return;

    // Vérifier prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return; // Pas de confetti si motion réduite

    const emojis = ['🎉', '🎊', '✨', '🌟', '💫', '⭐', '🎆'];
    const confettiCount = 30;

    const confettiElements: HTMLDivElement[] = [];

    for (let i = 0; i < confettiCount; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const confetti = document.createElement('div');
      confetti.textContent = emoji;
      confetti.style.position = 'fixed';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = '-50px';
      confetti.style.fontSize = `${Math.random() * 20 + 20}px`;
      confetti.style.zIndex = '9999';
      confetti.style.pointerEvents = 'none';
      confetti.style.userSelect = 'none';

      document.body.appendChild(confetti);
      confettiElements.push(confetti);

      // Animate
      const duration = Math.random() * 3000 + 2000;
      const rotation = Math.random() * 360;

      confetti.animate(
        [
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
          { transform: `translateY(100vh) rotate(${rotation}deg)`, opacity: 0 },
        ],
        {
          duration,
          easing: 'ease-in',
        }
      );
    }

    // Cleanup
    const timeout = setTimeout(() => {
      confettiElements.forEach((el) => el.remove());
    }, 5000);

    return () => {
      clearTimeout(timeout);
      confettiElements.forEach((el) => el.remove());
    };
  }, [paymentStatus]);

  const handleRetry = () => {
    if (!oid) return;
    setLoading(true);
    setError(false);
    setPaymentStatus(null);
    // Le useEffect se relancera automatiquement
  };

  // Cas 1: OID manquant
  if (!oid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-surface-active flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-error-600 rounded-full flex items-center justify-center">
              <XCircle className="w-16 h-16 text-text-inverse" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-2xl p-12" role="alert">
            <h1 className="text-3xl font-bold text-error-900 mb-4">
              Référence de paiement manquante.
            </h1>

            <div className="mt-8">
              <Link
                href="/plans"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium"
              >
                Retour aux offres
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cas 2: Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-surface-active flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center" aria-busy="true">
          <div className="bg-surface rounded-2xl shadow-2xl p-12">
            <div className="motion-safe:animate-spin rounded-full h-16 w-16 border-b-4 border-inverse-bg mx-auto mb-4"></div>
            <p className="text-text-secondary">
              Vérification du paiement en cours...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Cas 3: Erreur réseau
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-surface-active flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-warning-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-16 h-16 text-text-inverse" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-2xl p-12" role="alert">
            <h1 className="text-3xl font-bold text-warning-900 mb-4">
              Impossible de vérifier votre paiement.
            </h1>

            <div className="flex flex-col gap-4 mt-8">
              <button
                type="button"
                onClick={handleRetry}
                className="px-8 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium"
              >
                Réessayer
              </button>
              <Link
                href="/plans"
                className="px-8 py-4 border-2 border-border-strong text-text-primary rounded-lg hover:bg-surface-muted transition font-medium"
              >
                Retour aux offres
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cas 4: Status PENDING
  if (paymentStatus && paymentStatus.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center">
              <Clock className="w-16 h-16 text-text-inverse" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-2xl p-12" role="alert">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-900 mb-4">
              Paiement en attente
            </h1>

            <p className="text-xl text-primary-700 mb-8">
              Votre paiement n'a pas encore été validé. Dès validation, votre abonnement sera activé automatiquement.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium flex items-center justify-center gap-2"
              >
                Retour au Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/plans"
                className="px-8 py-4 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition font-medium"
              >
                Voir les offres
              </Link>
            </div>
          </div>

          <p className="mt-8 text-sm text-primary-700">
            Vous pouvez retrouver votre statut d'abonnement dans votre Dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Cas 5: Status FAILED
  if (paymentStatus && paymentStatus.status === 'FAILED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-error-50 to-error-100 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-error-600 rounded-full flex items-center justify-center">
              <XCircle className="w-16 h-16 text-text-inverse" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-2xl p-12" role="alert">
            <h1 className="text-4xl md:text-5xl font-bold text-error-900 mb-4">
              Paiement rejeté
            </h1>

            <p className="text-xl text-error-700 mb-8">
              Votre paiement a été rejeté. Vous pouvez relancer une demande depuis la page des offres.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/plans"
                className="px-8 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium flex items-center justify-center gap-2"
              >
                Réessayer
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-4 border-2 border-error-600 text-error-600 rounded-lg hover:bg-error-50 transition font-medium"
              >
                Retour au Dashboard
              </Link>
            </div>
          </div>

          <p className="mt-8 text-sm text-error-700">
            Vous pouvez retrouver votre statut d'abonnement dans votre Dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Cas 6: Status inconnu (ni PAID, ni PENDING, ni FAILED)
  if (paymentStatus && paymentStatus.status !== 'PAID') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-surface-active flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-warning-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-16 h-16 text-text-inverse" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-2xl p-12" role="alert">
            <h1 className="text-3xl font-bold text-warning-900 mb-4">
              Statut de paiement inconnu
            </h1>

            <p className="text-lg text-warning-700 mb-8">
              Impossible de confirmer le statut du paiement. Veuillez réessayer.
            </p>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handleRetry}
                className="px-8 py-4 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium"
              >
                Réessayer
              </button>
              <Link
                href="/dashboard"
                className="px-8 py-4 border-2 border-border-strong text-text-primary rounded-lg hover:bg-surface-muted transition font-medium"
              >
                Retour au Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cas 7: Status PAID - SUCCESS
  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-success-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-success-600 rounded-full flex items-center justify-center motion-safe:animate-bounce">
            <CheckCircle className="w-16 h-16 text-text-inverse" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-2xl p-12" role="alert">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-success-900 mb-4">
            Paiement validé !
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-success-700 mb-8">
            Votre abonnement a été activé avec succès
          </p>

          {/* Features */}
          <div className="bg-success-50 border border-success-200 rounded-lg p-6 mb-8">
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                <span className="text-success-900 text-sm">
                  Votre compte a été mis à niveau
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                <span className="text-success-900 text-sm">
                  Tous les avantages sont maintenant actifs
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                <span className="text-success-900 text-sm">
                  Profitez de votre visibilité accrue dès maintenant
                </span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-success-600 hover:bg-success-700 text-text-inverse font-bold rounded-lg transition flex items-center justify-center gap-2 group"
            >
              Accéder au Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/plans"
              className="px-8 py-4 border-2 border-success-600 text-success-600 font-bold rounded-lg hover:bg-success-50 transition"
            >
              Voir les offres
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-sm text-success-700">
          Vous pouvez retrouver votre statut d'abonnement dans votre Dashboard.
        </p>
      </div>
    </div>
  );
}

/**
 * SubscriptionSuccessPage
 * Page wrapper avec Suspense boundary pour useSearchParams.
 */
export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-background to-surface-active flex items-center justify-center">
          <div className="motion-safe:animate-spin rounded-full h-16 w-16 border-b-4 border-inverse-bg"></div>
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
