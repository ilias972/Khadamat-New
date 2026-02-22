import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Mail, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: "Centre d'aide — Khadamat",
  description: "Besoin d'aide ? Contactez notre équipe ou consultez notre FAQ.",
  alternates: { canonical: 'https://khadamat.ma/help' },
  openGraph: {
    title: "Centre d'aide — Khadamat",
    description: "Besoin d'aide ? Contactez notre équipe ou consultez notre FAQ.",
    url: 'https://khadamat.ma/help',
    siteName: 'Khadamat',
    locale: 'fr_MA',
    type: 'website',
    images: [{ url: 'https://khadamat.ma/og-image.jpg', width: 1200, height: 630, alt: 'Khadamat' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Centre d'aide — Khadamat",
    description: "Besoin d'aide ? Contactez notre équipe ou consultez notre FAQ.",
    images: ['https://khadamat.ma/og-image.jpg'],
  },
};

export default function HelpPage() {
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
          Centre d&apos;aide
        </h1>

        <p className="text-text-secondary mb-10 leading-relaxed">
          Vous avez une question ou besoin d&apos;assistance ? Notre équipe est
          disponible pour vous aider.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <a
            href="mailto:support@khadamat.ma"
            className="flex items-start gap-4 bg-surface border border-border rounded-2xl p-6 hover:shadow-card-hover transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary-500" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary mb-1">Par e-mail</h2>
              <p className="text-sm text-text-secondary">
                support@khadamat.ma
              </p>
            </div>
          </a>

          <div className="flex items-start gap-4 bg-surface border border-border rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-primary-500" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary mb-1">FAQ</h2>
              <p className="text-sm text-text-muted">
                Bientôt disponible
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
