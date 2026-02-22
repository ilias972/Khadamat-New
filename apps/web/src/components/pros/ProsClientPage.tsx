'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import ProCard from '../ProCard';
import type { PublicProCard, PublicCity, PublicCategory } from '@khadamat/contracts';
import { getJSON } from '@/lib/api';

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

interface ProsClientPageProps {
  initialData: PaginatedResponse<PublicProCard>;
  initialCities: PublicCity[];
  initialCategories: PublicCategory[];
  initialFilters: {
    cityId?: string;
    categoryId?: string;
    premium?: string;
    minRating?: string;
    page: number;
  };
}

type PremiumFilter = '' | 'true' | 'false';
const ALLOWED_MIN_RATINGS = ['4.5', '4', '3.5', '3', '2.5', '2'] as const;
type MinRatingFilter = '' | (typeof ALLOWED_MIN_RATINGS)[number];
const isAllowedMinRating = (value: string): value is (typeof ALLOWED_MIN_RATINGS)[number] =>
  (ALLOWED_MIN_RATINGS as readonly string[]).includes(value);

interface ProsFiltersState {
  cityId: string;
  categoryId: string;
  premium: PremiumFilter;
  minRating: MinRatingFilter;
}

export default function ProsClientPage({
  initialData,
  initialCities,
  initialCategories,
  initialFilters,
}: ProsClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pros, setPros] = useState<PublicProCard[]>(initialData.data);
  const [meta, setMeta] = useState<PaginationMeta>(initialData.meta);
  const [cities] = useState<PublicCity[]>(initialCities);
  const [categories] = useState<PublicCategory[]>(initialCategories);

  const [selectedCityId, setSelectedCityId] = useState(initialFilters.cityId || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialFilters.categoryId || '');
  const [selectedPremium, setSelectedPremium] = useState<PremiumFilter>(
    initialFilters.premium === 'true' || initialFilters.premium === 'false'
      ? initialFilters.premium
      : ''
  );
  const [selectedMinRating, setSelectedMinRating] = useState<MinRatingFilter>(
    initialFilters.minRating && isAllowedMinRating(initialFilters.minRating)
      ? initialFilters.minRating
      : ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync filters with URL
  useEffect(() => {
    const cityId = searchParams.get('cityId') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const premium = searchParams.get('premium');
    const minRating = searchParams.get('minRating');

    setSelectedCityId(cityId);
    setSelectedCategoryId(categoryId);
    setSelectedPremium(premium === 'true' || premium === 'false' ? premium : '');
    setSelectedMinRating(
      minRating && isAllowedMinRating(minRating)
        ? minRating
        : ''
    );
  }, [searchParams]);

  const buildQueryParams = (filters: ProsFiltersState, page: number) => {
    const queryParams = new URLSearchParams();
    if (filters.cityId) queryParams.append('cityId', filters.cityId);
    if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
    if (filters.premium) queryParams.append('premium', filters.premium);
    if (filters.minRating) queryParams.append('minRating', filters.minRating);
    queryParams.append('page', page.toString());
    return queryParams;
  };

  const getCurrentFilters = (): ProsFiltersState => ({
    cityId: selectedCityId,
    categoryId: selectedCategoryId,
    premium: selectedPremium,
    minRating: selectedMinRating,
  });

  const fetchPros = async (page: number = 1, filters?: ProsFiltersState) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = buildQueryParams(filters || getCurrentFilters(), page);

      const response = await getJSON<PaginatedResponse<PublicProCard>>(
        `/public/pros/v2?${queryParams.toString()}`
      );

      setPros(response.data);
      setMeta(response.meta);
    } catch (err) {
      console.error('Failed to fetch pros:', err);
      setError('Erreur lors du chargement des professionnels.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const filters = getCurrentFilters();
    const queryParams = buildQueryParams(filters, 1);

    router.push(`/pros?${queryParams.toString()}`);
    fetchPros(1, filters);
  };

  const handlePageChange = (newPage: number) => {
    const filters = getCurrentFilters();
    const queryParams = buildQueryParams(filters, newPage);
    router.push(`/pros?${queryParams.toString()}`);
    fetchPros(newPage, filters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane">
        <ol className="flex items-center gap-2 text-sm text-text-secondary">
          <li>
            <Link
              href="/"
              className="hover:text-text-primary motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg rounded"
            >
              Accueil
            </Link>
          </li>
          <span aria-hidden="true">/</span>
          <li className="text-text-primary font-medium" aria-current="page">
            Professionnels
          </li>
        </ol>
      </nav>

      {/* Back to home link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary text-sm font-medium motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg rounded"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Retour à l'accueil
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-text-primary">
          Professionnels disponibles
        </h1>
        <p className="text-text-secondary">
          {meta.total} professionnel{meta.total !== 1 ? 's' : ''} trouvé{meta.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Filtrer les résultats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label
              htmlFor="filter-city"
              className="block text-sm font-medium text-text-label mb-2"
            >
              Ville
            </label>
            <select
              id="filter-city"
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
              aria-label="Filtrer par ville"
            >
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-category"
              className="block text-sm font-medium text-text-label mb-2"
            >
              Service / Catégorie
            </label>
            <select
              id="filter-category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
              aria-label="Filtrer par catégorie"
            >
              <option value="">Tous les services</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-premium"
              className="block text-sm font-medium text-text-label mb-2"
            >
              Abonnement
            </label>
            <select
              id="filter-premium"
              value={selectedPremium}
              onChange={(e) => setSelectedPremium(e.target.value as PremiumFilter)}
              className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
              aria-label="Filtrer par abonnement"
            >
              <option value="">Tous</option>
              <option value="true">Abonnés</option>
              <option value="false">Non abonnés</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-min-rating"
              className="block text-sm font-medium text-text-label mb-2"
            >
              Note minimum
            </label>
            <select
              id="filter-min-rating"
              value={selectedMinRating}
              onChange={(e) => setSelectedMinRating(e.target.value as MinRatingFilter)}
              className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
              aria-label="Filtrer par note minimale"
            >
              <option value="">Tous</option>
              <option value="4.5">4.5+</option>
              <option value="4">4.0+</option>
              <option value="3.5">3.5+</option>
              <option value="3">3.0+</option>
              <option value="2.5">2.5+</option>
              <option value="2">2.0+</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading}
              className="w-full px-6 py-2 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover motion-safe:transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Appliquer les filtres de recherche"
            >
              {loading ? 'Chargement...' : 'Appliquer'}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="bg-error-50 border border-error-200 rounded-lg p-4"
          role="alert"
        >
          <p className="text-error-800 mb-3">{error}</p>
          <button
            onClick={() => fetchPros(meta.page)}
            disabled={loading}
            className="px-4 py-2 bg-error-600 text-inverse-text rounded-lg hover:bg-error-700 motion-safe:transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-surface rounded-lg border border-border p-8 text-center" aria-busy="true">
          <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4" />
          <p className="text-text-secondary">Chargement des professionnels...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && pros.length === 0 && (
        <div className="bg-surface-active rounded-lg p-12 text-center">
          <p className="text-text-secondary text-lg">
            Aucun professionnel trouvé pour ces critères.
          </p>
          <p className="text-text-muted text-sm mt-2">
            Essayez de réduire la note minimum ou de changer le filtre d&apos;abonnement.
          </p>
        </div>
      )}

      {/* Pro cards grid */}
      {!loading && !error && pros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pros.map((pro) => (
            <ProCard key={pro.id} pro={pro} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            onClick={() => handlePageChange(meta.page - 1)}
            disabled={!meta.hasPrev}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-active motion-safe:transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Page précédente"
          >
            <ChevronLeft size={20} aria-hidden="true" />
            Précédent
          </button>

          <span className="text-text-secondary text-sm">
            Page {meta.page} sur {meta.totalPages}
          </span>

          <button
            onClick={() => handlePageChange(meta.page + 1)}
            disabled={!meta.hasNext}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-active motion-safe:transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Page suivante"
          >
            Suivant
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
