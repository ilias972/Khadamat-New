'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { getJSON } from '@/lib/api';
import SectionHeader from './SectionHeader';
import EmptyState from './EmptyState';
import VerifiedBadge from './VerifiedBadge';

/** Extended type — optional fields degrade gracefully if API doesn't return them */
interface FeaturedPro {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  isVerified: boolean;
  services: { name: string; priceFormatted: string; categoryId: string }[];
  isPremium?: boolean;
  rating?: number;
  reviewCount?: number;
}

interface ProsV2Response {
  data: FeaturedPro[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

type SectionState = 'loading' | 'ready' | 'empty' | 'error';

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

interface FeaturedProsProps {
  selectedCityId?: string | null;
}

export default function FeaturedPros({ selectedCityId = null }: FeaturedProsProps) {
  const [data, setData] = useState<{ pros: FeaturedPro[]; total: number }>({
    pros: [],
    total: 0,
  });
  const [state, setState] = useState<SectionState>('loading');
  const abortRef = useRef<AbortController | null>(null);

  const fetchPros = useCallback(async (city: string | null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState('loading');
    try {
      const params = new URLSearchParams();
      if (city) params.set('cityId', city);
      params.set('page', '1');
      params.set('limit', '4');

      const res = await getJSON<ProsV2Response>(`/public/pros/v2?${params.toString()}`);

      if (!controller.signal.aborted) {
        setData({ pros: res.data, total: res.meta.total });
        setState(res.data.length > 0 ? 'ready' : 'empty');
      }
    } catch {
      if (!controller.signal.aborted) {
        setData({ pros: [], total: 0 });
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    fetchPros(selectedCityId);
    return () => abortRef.current?.abort();
  }, [selectedCityId, fetchPros]);

  return (
    <section aria-labelledby="featured-pros-title" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          id="featured-pros-title"
          badge="Sélection"
          title="Pros de la semaine"
          subtitle="Sélectionnés pour leur qualité, leur réactivité et leur sérieux."
        />

        {/* Loading */}
        {state === 'loading' && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-error-600 mb-4">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">Impossible de charger les pros</span>
            </div>
            <button
              type="button"
              onClick={() => fetchPros(selectedCityId)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Réessayer
            </button>
          </div>
        )}

        {/* Empty state */}
        {state === 'empty' && (
          <EmptyState
            icon={<Users className="w-7 h-7" aria-hidden="true" />}
            title="Aucun pro pour le moment"
            message="De nouveaux pros arrivent bientôt dans votre ville."
          />
        )}

        {/* Pro cards */}
        {state === 'ready' && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.pros.map((pro) => (
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
                      {pro.isVerified && <VerifiedBadge small />}
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
                  {pro.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-success-50 text-success-700 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      Vérifié
                    </span>
                  )}
                  {pro.isPremium && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                      Abonné
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
