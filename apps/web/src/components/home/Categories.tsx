'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Wrench,
  Zap,
  Paintbrush,
  Hammer,
  Snowflake,
  Sparkles,
  Leaf,
  Lock,
  Tag,
  AlertCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PublicCategory } from '@khadamat/contracts';
import SectionHeader from './SectionHeader';
import EmptyState from './EmptyState';

const iconMap: Record<string, LucideIcon> = {
  plomberie: Wrench,
  electricite: Zap,
  peinture: Paintbrush,
  bricolage: Hammer,
  climatisation: Snowflake,
  menage: Sparkles,
  jardinage: Leaf,
  serrurerie: Lock,
};

function getIconForSlug(slug: string): LucideIcon {
  return iconMap[slug] || Tag;
}

type SectionState = 'loading' | 'ready' | 'empty' | 'error';

function CategorySkeleton() {
  return (
    <div className="bg-surface rounded-2xl p-6 shadow-sm border border-transparent animate-pulse flex flex-col items-center md:items-start">
      <div className="w-14 h-14 rounded-xl bg-border-muted mb-4" />
      <div className="h-5 w-24 bg-border-muted rounded mb-2" />
      <div className="h-3 w-32 bg-border-muted rounded" />
    </div>
  );
}

interface CategoriesProps {
  categories: PublicCategory[];
  state: SectionState;
  onRetry: () => void | Promise<void>;
  selectedCityId?: string | null;
}

function getCategoryHref(categoryId: string, selectedCityId?: string | null): string {
  const params = new URLSearchParams();
  if (selectedCityId) {
    params.set('cityId', selectedCityId);
  }
  params.set('categoryId', categoryId);
  return `/pros?${params.toString()}`;
}

export default function Categories({
  categories,
  state,
  onRetry,
  selectedCityId,
}: CategoriesProps) {

  return (
    <section aria-labelledby="categories-title" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          id="categories-title"
          badge="Nos Services"
          title="Tout ce dont votre maison a besoin"
        />
        <div className="flex justify-center mb-8 -mt-6">
          <Link
            href="/pros"
            className="group flex items-center gap-2 text-text-secondary font-semibold hover:text-primary-500 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
          >
            Voir toutes les catégories
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CategorySkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-error-600 mb-4">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">Impossible de charger les catégories</span>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Réessayer
            </button>
          </div>
        )}

        {/* Empty */}
        {state === 'empty' && (
          <EmptyState
            icon={<Layers className="w-7 h-7" aria-hidden="true" />}
            title="Aucune catégorie disponible"
            message="Les catégories de services arrivent bientôt."
          />
        )}

        {/* Ready */}
        {state === 'ready' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6" role="list">
            {categories.map((cat) => {
              const Icon = getIconForSlug(cat.slug);
              return (
                <Link
                  key={cat.id}
                  role="listitem"
                  href={getCategoryHref(cat.id, selectedCityId)}
                  className="group bg-surface rounded-2xl p-6 shadow-sm hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary-200 flex flex-col items-center text-center md:items-start md:text-left focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary-50 group-hover:bg-primary-500 transition-colors duration-300 flex items-center justify-center mb-4">
                    <Icon
                      className="w-7 h-7 text-primary-500 group-hover:text-white transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-bold text-lg text-text-primary mb-1">{cat.name}</h3>
                  <p className="text-sm text-text-muted">Disponible immédiatement</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
