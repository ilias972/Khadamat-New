import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mentions Légales — Khadamat',
  description: 'Mentions légales de la plateforme Khadamat.',
  alternates: { canonical: 'https://khadamat.ma/legal/mentions' },
  openGraph: {
    title: 'Mentions Légales — Khadamat',
    description: 'Mentions légales de la plateforme Khadamat.',
    url: 'https://khadamat.ma/legal/mentions',
    siteName: 'Khadamat',
    locale: 'fr_MA',
    type: 'website',
    images: [{ url: 'https://khadamat.ma/og-image.jpg', width: 1200, height: 630, alt: 'Khadamat' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mentions Légales — Khadamat',
    description: 'Mentions légales de la plateforme Khadamat.',
    images: ['https://khadamat.ma/og-image.jpg'],
  },
};

export default function MentionsPage() {
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
          Mentions Légales
        </h1>

        <div className="prose prose-sm max-w-none text-text-secondary space-y-6">
          <p className="bg-surface border border-border rounded-xl p-6 text-text-muted">
            Cette page est temporairement indisponible. Les Mentions Légales
            complètes seront publiées avant la mise en production. Pour toute
            question, contactez : support@khadamat.ma.
          </p>
        </div>
      </div>
    </main>
  );
}
