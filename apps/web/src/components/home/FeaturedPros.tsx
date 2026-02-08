'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Star, BadgeCheck, Rocket, Crown, Users } from 'lucide-react';
import { getJSON } from '@/lib/api';

/** Extended type — optional fields degrade gracefully if API doesn't return them */
interface FeaturedPro {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  isVerified: boolean;
  services: { name: string; priceFormatted: string; categoryId: string }[];
  isPremium?: boolean;
  isBoosted?: boolean;
  rating?: number;
  reviewCount?: number;
}

function sortPros(pros: FeaturedPro[]): FeaturedPro[] {
  // 1. KYC approved only
  const valid = pros.filter((p) => p.isVerified);

  // 2. Sort: Premium > Boost > rating > reviewCount
  return valid.sort((a, b) => {
    if (a.isPremium && !b.isPremium) return -1;
    if (!a.isPremium && b.isPremium) return 1;

    if (a.isBoosted && !b.isBoosted) return -1;
    if (!a.isBoosted && b.isBoosted) return 1;

    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;

    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
}

function ProCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-card animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-border-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 bg-border-muted rounded" />
          <div className="h-3 w-20 bg-border-muted rounded" />
        </div>
      </div>
      <div className="h-3 w-32 bg-border-muted rounded mb-3" />
      <div className="h-3 w-24 bg-border-muted rounded mb-6" />
      <div className="h-10 w-full bg-border-muted rounded-xl" />
    </div>
  );
}

export default function FeaturedPros() {
  const [pros, setPros] = useState<FeaturedPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityId, setCityId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Listen for Hero city selection
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setCityId(detail || null);
    };
    window.addEventListener('hero-city-change', handler);
    return () => window.removeEventListener('hero-city-change', handler);
  }, []);

  const fetchPros = useCallback(async (city: string | null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (city) params.set('cityId', city);
      params.set('limit', '20');
      const qs = params.toString();

      const data = await getJSON<FeaturedPro[]>(`/public/pros?${qs}`);

      if (!controller.signal.aborted) {
        const sorted = sortPros(data);
        setPros(sorted.slice(0, 4));
        setLoading(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        setPros([]);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchPros(cityId);
    return () => abortRef.current?.abort();
  }, [cityId, fetchPros]);

  return (
    <section aria-labelledby="featured-pros-title" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary-600 font-bold tracking-wide uppercase text-xs bg-primary-50 px-3 py-1 rounded-full mb-4">
            <Users className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            Sélection
          </span>
          <h2
            id="featured-pros-title"
            className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4"
          >
            Pros de la semaine
          </h2>
          <p className="text-text-secondary text-lg max-w-xl mx-auto leading-relaxed">
            Sélectionnés pour leur qualité, leur réactivité et leur sérieux.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && pros.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
              <Users className="w-7 h-7 text-primary-400" aria-hidden="true" />
            </div>
            <p className="text-text-secondary text-lg font-medium">
              De nouveaux pros arrivent bientôt dans votre ville.
            </p>
          </div>
        )}

        {/* Pro cards */}
        {!loading && pros.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pros.map((pro) => (
              <article
                key={pro.id}
                className="bg-surface rounded-2xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300 motion-reduce:transition-none flex flex-col"
              >
                {/* Header: avatar + name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-lg font-bold text-white" aria-hidden="true">
                      {pro.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-text-primary truncate">
                        {pro.firstName} {pro.lastName}
                      </h3>
                      {pro.isVerified && (
                        <BadgeCheck
                          className="w-4 h-4 text-primary-500 flex-shrink-0"
                          aria-label="Identité vérifiée"
                        />
                      )}
                    </div>
                    <p className="text-xs text-text-muted truncate">{pro.city}</p>
                  </div>
                </div>

                {/* Service */}
                {pro.services.length > 0 && (
                  <p className="text-sm text-text-secondary mb-2 truncate">
                    {pro.services[0].name}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {pro.isPremium && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" aria-hidden="true" />
                      Premium
                    </span>
                  )}
                  {pro.isBoosted && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                      <Rocket className="w-3 h-3" aria-hidden="true" />
                      Boost
                    </span>
                  )}
                </div>

                {/* Rating */}
                {typeof pro.rating === 'number' && pro.rating > 0 && (
                  <div className="flex items-center gap-1.5 mb-4 text-sm">
                    <Star
                      className="w-4 h-4 text-primary-500 fill-primary-500"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-text-primary">
                      {pro.rating.toFixed(1)}
                    </span>
                    {typeof pro.reviewCount === 'number' && pro.reviewCount > 0 && (
                      <span className="text-text-muted">
                        ({pro.reviewCount} avis)
                      </span>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="mt-auto pt-2">
                  <Link
                    href={`/pro/${pro.id}`}
                    className="block w-full text-center px-4 py-2.5 border-2 border-primary-500 text-primary-600 hover:bg-primary-50 rounded-xl font-semibold text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                  >
                    Voir le profil
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
