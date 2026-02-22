import Navbar from '@/components/Navbar';
import ProsClientPage from '@/components/pros/ProsClientPage';
import type { PublicProCard, PublicCity, PublicCategory } from '@khadamat/contracts';
import { getApiBaseUrl } from '@/lib/api';

interface ProsPageProps {
  searchParams: Promise<{
    cityId?: string;
    categoryId?: string;
    premium?: string;
    minRating?: string;
    page?: string;
  }>;
}

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

/**
 * Page de listing des Pros (v2)
 *
 * - Endpoint v2 avec cache, tri premium-first, pagination
 * - Filtres ville/catégorie via query params
 * - Pagination UI
 * - Retry sur erreur
 * - Accessibilité complète
 */
export default async function ProsPage({ searchParams }: ProsPageProps) {
  const params = await searchParams;
  const apiUrl = getApiBaseUrl();

  const page = params.page ? parseInt(params.page, 10) : 1;
  const cityId = params.cityId;
  const categoryId = params.categoryId;
  const premium = params.premium === 'true' || params.premium === 'false' ? params.premium : undefined;
  const minRating = params.minRating || undefined;

  // Fetch pros v2 + cities + categories en parallèle
  const [prosResponse, citiesResponse, categoriesResponse] = await Promise.all([
    fetchPros(apiUrl, { cityId, categoryId, premium, minRating, page }),
    fetchCities(apiUrl),
    fetchCategories(apiUrl),
  ]);

  // Si erreur critique, afficher page d'erreur basique (RSC)
  if (prosResponse.error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="bg-error-50 border border-error-200 rounded-lg p-8 text-center" role="alert">
              <h1 className="text-2xl font-bold text-error-800 mb-4">
                Erreur de chargement
              </h1>
              <p className="text-error-700 mb-4">
                {prosResponse.error}
              </p>
              <a
                href="/pros"
                className="inline-block px-6 py-3 bg-error-600 text-inverse-text rounded-lg hover:bg-error-700 motion-safe:transition font-medium"
              >
                Réessayer
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <ProsClientPage
            initialData={prosResponse.data!}
            initialCities={citiesResponse}
            initialCategories={categoriesResponse}
            initialFilters={{ cityId, categoryId, premium, minRating, page }}
          />
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS SERVER-SIDE
// ═══════════════════════════════════════════════════════════════

async function fetchPros(
  apiUrl: string,
  filters: {
    cityId?: string;
    categoryId?: string;
    premium?: string;
    minRating?: string;
    page: number;
  }
): Promise<{ data?: PaginatedResponse<PublicProCard>; error?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (filters.cityId) queryParams.append('cityId', filters.cityId);
    if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
    if (filters.premium) queryParams.append('premium', filters.premium);
    if (filters.minRating) queryParams.append('minRating', filters.minRating);
    queryParams.append('page', filters.page.toString());

    const url = `${apiUrl}/public/pros/v2?${queryParams.toString()}`;
    const response = await fetch(url, {
      cache: 'no-store', // Let backend cache handle it
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { error: 'Impossible de charger les professionnels.' };
    }

    const data: PaginatedResponse<PublicProCard> = await response.json();
    return { data };
  } catch (err) {
    console.error('Failed to fetch pros:', err);
    return { error: 'Erreur réseau lors du chargement des professionnels.' };
  }
}

async function fetchCities(apiUrl: string): Promise<PublicCity[]> {
  try {
    const response = await fetch(`${apiUrl}/public/cities`, {
      cache: 'force-cache', // Cities change rarely
    });
    if (!response.ok) return [];
    return response.json();
  } catch (err) {
    console.error('Failed to fetch cities:', err);
    return [];
  }
}

async function fetchCategories(apiUrl: string): Promise<PublicCategory[]> {
  try {
    const response = await fetch(`${apiUrl}/public/categories`, {
      cache: 'force-cache', // Categories change rarely
    });
    if (!response.ok) return [];
    return response.json();
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return [];
  }
}
