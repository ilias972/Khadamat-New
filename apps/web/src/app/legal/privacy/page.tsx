import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — Khadamat',
  description: 'Politique de confidentialité et protection des données personnelles de Khadamat.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-extrabold text-text-primary mb-6">
          Politique de Confidentialité
        </h1>

        <div className="prose prose-sm max-w-none text-text-secondary space-y-6">
          <p>
            Khadamat s&apos;engage à protéger vos données personnelles conformément
            à la législation marocaine en vigueur (Loi 09-08).
          </p>

          <p className="bg-surface border border-border rounded-xl p-6 text-text-muted text-center">
            Cette page est en cours de rédaction. La politique de confidentialité
            complète sera publiée prochainement.
          </p>

          <p>
            Pour toute question relative à vos données, contactez-nous à{' '}
            <a href="mailto:support@khadamat.ma" className="text-primary-600 hover:underline">
              support@khadamat.ma
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
