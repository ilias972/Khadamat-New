'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Clock, MapPin, Search, Tag } from 'lucide-react';
import { POSTS, type BlogPost } from '@/lib/blogPosts';

const formatPublishedDate = (isoDate: string): string =>
  new Intl.DateTimeFormat('fr-MA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));

export default function BlogContent() {
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const cities = useMemo(() => Array.from(new Set(POSTS.map((post) => post.city))), []);
  const categories = useMemo(() => Array.from(new Set(POSTS.map((post) => post.category))), []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return POSTS.filter((post) => {
      if (selectedCity !== 'all' && post.city !== selectedCity) {
        return false;
      }

      if (selectedCategory !== 'all' && post.category !== selectedCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      // Build searchable text from contentSections
      const contentText = post.contentSections
        .flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])])
        .join(' ');

      const searchableText = [
        post.title,
        post.excerpt,
        contentText,
        post.city,
        post.category,
        ...post.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, selectedCategory, selectedCity]);

  return (
    <main className="min-h-screen bg-background">
      <header className="relative pt-28 pb-14 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-info-50 via-surface to-transparent opacity-70 -z-10"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border shadow-sm mb-8">
                <BookOpen size={14} className="text-info-600" aria-hidden="true" />
                <span className="text-xs font-semibold text-text-label tracking-wide uppercase">
                  Blog Khadamat Maroc
                </span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-5 max-w-4xl mx-auto leading-[1.1]">
              Conseils locaux pour trouver les meilleurs artisans au Maroc
            </h1>

            <p className="text-lg text-text-secondary max-w-3xl mx-auto mb-8 leading-relaxed">
              Découvrez 9 guides pratiques sur la plomberie, climatisation, électricité,
              jardinage et plus, pensés pour Casablanca, Marrakech, Rabat et tout le Maroc.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-left max-w-5xl mx-auto">
              <div className="relative md:col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-text-muted" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl leading-5 bg-surface placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-info-500 focus:border-info-500 sm:text-sm shadow-sm"
                  placeholder="Rechercher par titre, extrait, mot-clé, ville ou catégorie"
                  aria-label="Rechercher des articles"
                />
              </div>

              <div>
                <label htmlFor="blog-city-filter" className="sr-only">
                  Filtrer par ville
                </label>
                <select
                  id="blog-city-filter"
                  value={selectedCity}
                  onChange={(event) => setSelectedCity(event.target.value)}
                  className="block w-full py-3 px-3 border border-border rounded-xl bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-info-500 focus:border-info-500 shadow-sm"
                  aria-label="Filtrer les articles par ville"
                >
                  <option value="all">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="blog-category-filter" className="sr-only">
                  Filtrer par catégorie
                </label>
                <select
                  id="blog-category-filter"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="block w-full py-3 px-3 border border-border rounded-xl bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-info-500 focus:border-info-500 shadow-sm"
                  aria-label="Filtrer les articles par catégorie"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28" aria-label="Liste des articles">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Articles</h2>
          <p className="text-sm text-text-secondary">{filteredPosts.length} résultat(s)</p>
        </div>

        {filteredPosts.length === 0 ? (
          <article className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Aucun article ne correspond à votre recherche
            </h3>
            <p className="text-text-secondary">
              Essayez un autre mot-clé ou réinitialisez les filtres ville et catégorie.
            </p>
          </article>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => {
              const visibleKeywords = post.keywords.slice(0, 3);
              const remainingKeywords = Math.max(post.keywords.length - 3, 0);

              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group relative flex h-full flex-col rounded-2xl border border-border bg-surface shadow-sm motion-safe:transition-all motion-safe:duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <article className="flex h-full flex-col">
                    <div className="h-40 w-full shrink-0 bg-gradient-to-br from-info-50 via-surface-active to-surface flex items-center justify-center">
                      <BookOpen size={42} className="text-info-200" aria-hidden="true" />
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-info-50 px-2 py-1 text-xs font-semibold text-info-700">
                          <MapPin size={12} aria-hidden="true" />
                          {post.city}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-active px-2 py-1 text-xs font-semibold text-text-secondary">
                          <Tag size={12} aria-hidden="true" />
                          {post.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold leading-snug text-text-primary mb-2">{post.title}</h3>

                      <p className="text-sm text-text-secondary leading-relaxed mb-4">{post.excerpt}</p>

                      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={12} aria-hidden="true" />
                          {post.readingTimeMin} min
                        </span>
                        <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt)}</time>
                      </div>

                      <div className="mb-5 flex flex-wrap gap-2" aria-label="Mots-clés de l'article">
                        {visibleKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full border border-border px-2 py-1 text-xs text-text-secondary"
                          >
                            {keyword}
                          </span>
                        ))}
                        {remainingKeywords > 0 ? (
                          <span className="rounded-full border border-border px-2 py-1 text-xs text-text-muted">
                            +{remainingKeywords}
                          </span>
                        ) : null}
                      </div>

                      <span className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-inverse-bg px-4 py-2 text-sm font-semibold text-inverse-text group-hover:bg-inverse-hover motion-safe:transition-colors">
                        Lire l&apos;article
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative py-16 bg-inverse-bg rounded-3xl overflow-hidden text-center px-4">
          <div
            className="absolute top-10 left-10 w-64 h-64 rounded-full bg-info-500 opacity-10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-info-400 opacity-10 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold text-text-inverse mb-4">
              Besoin d&apos;un artisan vérifié maintenant ?
            </h2>
            <p className="text-text-muted mb-8 max-w-lg mx-auto">
              Comparez des professionnels à Casablanca, Rabat et Marrakech en quelques minutes.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-surface text-text-primary px-8 py-4 rounded-full font-bold hover:bg-info-50 transition-colors shadow-lg"
            >
              Trouver un professionnel
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="text-center pb-12 mt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary text-sm font-medium transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
