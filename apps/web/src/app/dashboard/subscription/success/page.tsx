'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  // Confetti effect (emoji animation)
  useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-12">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-green-900 dark:text-green-50 mb-4">
            Paiement validé !
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-green-700 dark:text-green-300 mb-8">
            Votre abonnement a été activé avec succès
          </p>

          {/* Features */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-green-900 dark:text-green-50 text-sm">
                  Votre compte a été mis à niveau
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-green-900 dark:text-green-50 text-sm">
                  Tous les avantages sont maintenant actifs
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-green-900 dark:text-green-50 text-sm">
                  Profitez de votre visibilité accrue dès maintenant
                </span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 group"
            >
              Accéder au Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/plans"
              className="px-8 py-4 border-2 border-green-600 dark:border-green-400 text-green-600 dark:text-green-400 font-bold rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition"
            >
              Voir les offres
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-sm text-green-700 dark:text-green-300">
          Un email de confirmation vous a été envoyé
        </p>
      </div>
    </div>
  );
}
