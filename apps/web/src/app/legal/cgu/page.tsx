import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Khadamat",
  description: "Conditions générales d'utilisation de la plateforme Khadamat.",
};

export default function CguPage() {
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
          Conditions Générales d&apos;Utilisation
        </h1>

        <div className="prose prose-sm max-w-none text-text-secondary space-y-6">
          <p>
            Les présentes conditions générales d&apos;utilisation (CGU) régissent
            l&apos;accès et l&apos;utilisation de la plateforme Khadamat.
          </p>

          <p className="bg-surface border border-border rounded-xl p-6 text-text-muted text-center">
            Cette page est en cours de rédaction. Les CGU complètes seront
            publiées prochainement.
          </p>

          <p>
            Pour toute question, contactez-nous à{' '}
            <a href="mailto:support@khadamat.ma" className="text-primary-600 hover:underline">
              support@khadamat.ma
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
