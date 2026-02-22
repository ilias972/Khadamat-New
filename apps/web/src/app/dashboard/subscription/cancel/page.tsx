'use client';

import Link from 'next/link';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-surface-active flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Cancel Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-text-secondary rounded-full flex items-center justify-center">
            <XCircle className="w-16 h-16 text-text-inverse" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-2xl p-12">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Paiement annulé
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-text-secondary mb-8">
            Aucun montant n&apos;a été débité de votre compte.
          </p>

          {/* Info Box */}
          <div className="bg-background border border-border rounded-lg p-6 mb-8">
            <p className="text-sm text-text-label">
              Si vous avez rencontré un problème lors du paiement, n&apos;hésitez pas à réessayer.
              Notre équipe support est également disponible pour vous aider.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/plans"
              className="px-8 py-4 bg-inverse-bg text-inverse-text font-bold rounded-lg hover:bg-inverse-hover transition flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" />
              Réessayer
            </Link>

            <Link
              href="/dashboard"
              className="px-8 py-4 border-2 border-border-strong text-text-primary font-bold rounded-lg hover:bg-surface-hover transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour au Dashboard
            </Link>
          </div>
        </div>

        {/* Support note */}
        <p className="mt-8 text-sm text-text-secondary">
          Besoin d&apos;aide ?{' '}
          <a href="mailto:support@khadamat.ma" className="underline hover:text-text-primary">
            Contactez le support
          </a>
        </p>
      </div>
    </div>
  );
}
