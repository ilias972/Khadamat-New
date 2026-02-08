import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Clock, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog — Khadamat',
  description: 'Conseils et astuces pour mieux choisir vos professionnels et mieux travailler au Maroc.',
};

interface Article {
  title: string;
  excerpt: string;
  date: string;
}

const articles: Article[] = [
  {
    title: 'Comment choisir un bon plombier ?',
    excerpt:
      '5 critères concrets pour distinguer un plombier fiable avant de lui confier vos travaux.',
    date: 'Février 2026',
  },
  {
    title: 'Préparer son logement avant une intervention',
    excerpt:
      'Dégager l\'accès, couper l\'eau ou l\'électricité : les bons réflexes pour que le pro travaille vite et bien.',
    date: 'Janvier 2026',
  },
  {
    title: 'Pourquoi la vérification d\'identité protège tout le monde',
    excerpt:
      'Le KYC chez Khadamat : comment la vérification CIN renforce la confiance entre clients et professionnels.',
    date: 'Janvier 2026',
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary-50 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Blog
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary mb-4">
            Blog
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            Conseils &amp; astuces pour mieux choisir et mieux travailler.
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, idx) => (
              <article
                key={idx}
                className="bg-surface rounded-2xl border border-border p-6 flex flex-col justify-between shadow-card"
              >
                <div>
                  <div className="flex items-center gap-2 text-text-muted text-xs font-medium mb-4">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <time>{article.date}</time>
                  </div>
                  <h2 className="text-lg font-bold text-text-primary mb-2 leading-snug">
                    {article.title}
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-text-muted cursor-default select-none"
                >
                  Bientôt disponible
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="pb-16 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors font-medium focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
