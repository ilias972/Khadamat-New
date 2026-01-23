'use client';

import Link from 'next/link';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Cancel Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-zinc-600 dark:bg-zinc-400 rounded-full flex items-center justify-center">
            <XCircle className="w-16 h-16 text-white dark:text-zinc-900" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-12">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Paiement annulé
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Aucun montant n&apos;a été débité de votre compte.
          </p>

          {/* Info Box */}
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 mb-8">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Si vous avez rencontré un problème lors du paiement, n&apos;hésitez pas à réessayer.
              Notre équipe support est également disponible pour vous aider.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/plans"
              className="px-8 py-4 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-bold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" />
              Réessayer
            </Link>

            <Link
              href="/dashboard"
              className="px-8 py-4 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-bold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour au Dashboard
            </Link>
          </div>
        </div>

        {/* Support note */}
        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          Besoin d&apos;aide ?{' '}
          <a href="mailto:support@khadamat.ma" className="underline hover:text-zinc-900 dark:hover:text-zinc-50">
            Contactez le support
          </a>
        </p>
      </div>
    </div>
  );
}
