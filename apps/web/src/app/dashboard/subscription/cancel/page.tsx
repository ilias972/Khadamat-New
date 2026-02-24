'use client';

import Link from 'next/link';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SubscriptionCancelPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-lg md:p-10">
          <div className="mb-8 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-text-secondary">
              <XCircle className="h-16 w-16 text-text-inverse" aria-hidden="true" />
            </div>
          </div>

          <h1 className="mb-4 text-4xl font-bold text-text-primary md:text-5xl">
            Paiement annulé
          </h1>

          <p className="mb-8 text-lg text-text-secondary">
            Aucun montant n&apos;a été débité de votre compte.
          </p>

          <div className="mb-8 rounded-lg border border-border bg-background p-6">
            <p className="text-sm text-text-label">
              Si vous avez rencontré un problème lors du paiement, vous pouvez relancer une demande.
              Notre équipe support reste disponible si besoin.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard/subscription"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-inverse-bg px-8 py-4 font-bold text-inverse-text hover:bg-inverse-hover motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg"
            >
              <RefreshCcw className="h-5 w-5" aria-hidden="true" />
              Réessayer
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-border-strong px-8 py-4 font-bold text-text-primary hover:bg-surface-hover motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Retour au Dashboard
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Besoin d&apos;aide ?{' '}
          <a
            href="mailto:support@khadamat.ma"
            className="underline hover:text-text-primary motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg"
          >
            Contactez le support
          </a>
        </p>
      </div>
    </DashboardLayout>
  );
}
