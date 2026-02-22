import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Clock, MapPin, Tag } from 'lucide-react';
import { getPostBySlug, getAllSlugs, type BlogPost } from '@/lib/blogPosts';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://khadamat.ma';

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Article non trouvé | Khadamat Maroc',
    };
  }

  const url = `${BASE_URL}/blog/${slug}`;
  const ogImage = post.ogImage || `${BASE_URL}/og-blog-default.jpg`;

  return {
    title: `${post.title} | Khadamat Maroc`,
    description: post.excerpt,
    keywords: post.keywords,
    authors: [{ name: 'Khadamat Maroc' }],
    openGraph: {
      type: 'article',
      locale: 'fr_MA',
      url,
      title: post.title,
      description: post.excerpt,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      tags: post.keywords,
      siteName: 'Khadamat Maroc',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

const formatPublishedDate = (isoDate: string): string =>
  new Intl.DateTimeFormat('fr-MA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.ogImage || `${BASE_URL}/og-blog-default.jpg`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Khadamat Maroc',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Khadamat Maroc',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${slug}`,
    },
    keywords: post.keywords.join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <nav className="pt-28 pb-6 border-b border-border bg-surface" aria-label="Fil d'Ariane">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <ol className="flex items-center gap-2 text-sm text-text-secondary">
              <li>
                <Link href="/" className="hover:text-text-primary motion-safe:transition-colors">
                  Accueil
                </Link>
              </li>
              <ArrowRight size={14} aria-hidden="true" />
              <li>
                <Link href="/blog" className="hover:text-text-primary motion-safe:transition-colors">
                  Blog
                </Link>
              </li>
              <ArrowRight size={14} aria-hidden="true" />
              <li className="text-text-primary font-medium truncate" aria-current="page">
                {post.title}
              </li>
            </ol>
          </div>
        </nav>

        {/* Article Header */}
        <header className="pt-12 pb-8 bg-surface border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-info-50 px-2.5 py-1 text-xs font-semibold text-info-700">
                <MapPin size={12} aria-hidden="true" />
                {post.city}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-active px-2.5 py-1 text-xs font-semibold text-text-secondary">
                <Tag size={12} aria-hidden="true" />
                {post.category}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-text-primary mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-lg text-text-secondary mb-6 leading-relaxed">{post.excerpt}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" />
                <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt)}</time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} aria-hidden="true" />
                {post.readingTimeMin} min de lecture
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={14} aria-hidden="true" />
                Article vérifié
              </span>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <article className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg prose-slate max-w-none">
            {post.contentSections.map((section, sectionIndex) => (
              <section key={sectionIndex} className="mb-10">
                <h2 className="text-2xl font-bold text-text-primary mb-4 mt-8">
                  {section.heading}
                </h2>

                {section.paragraphs.map((paragraph, pIndex) => (
                  <p key={pIndex} className="text-text-secondary leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                    {section.bullets.map((bullet, bIndex) => (
                      <li key={bIndex} className="text-text-secondary leading-relaxed">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Keywords */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-sm font-semibold text-text-label mb-3">Mots-clés</h3>
            <div className="flex flex-wrap gap-2">
              {post.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </article>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="relative py-12 bg-inverse-bg rounded-3xl overflow-hidden text-center px-6">
            <div
              className="absolute top-10 left-10 w-64 h-64 rounded-full bg-info-500 opacity-10 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-info-400 opacity-10 blur-2xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col items-center justify-center">
              <h2 className="text-2xl md:text-3xl font-bold text-text-inverse mb-3">
                Besoin d&apos;un artisan vérifié maintenant ?
              </h2>
              <p className="text-text-muted mb-6 max-w-lg mx-auto">
                Comparez des professionnels à Casablanca, Rabat et Marrakech en quelques minutes.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-surface text-text-primary px-8 py-3 rounded-full font-bold hover:bg-info-50 motion-safe:transition-colors shadow-lg"
              >
                Trouver un professionnel
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="text-center pb-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary text-sm font-medium motion-safe:transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Retour aux articles
          </Link>
        </div>
      </main>
    </>
  );
}
