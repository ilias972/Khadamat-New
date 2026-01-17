import Header from '../../components/Header';
import ProCard from '../../components/ProCard';
import type { PublicProCard } from '@khadamat/contracts';

interface ProsPageProps {
  searchParams: Promise<{
    cityId?: string;
    categoryId?: string;
  }>;
}

/**
 * Page de listing des Pros
 *
 * - Affiche la liste des Pros actifs
 * - Filtres via query params : cityId, categoryId
 */
export default async function ProsPage({ searchParams }: ProsPageProps) {
  const params = await searchParams;
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  // Construction de l'URL avec query params
  const queryParams = new URLSearchParams();
  if (params.cityId) queryParams.append('cityId', params.cityId);
  if (params.categoryId) queryParams.append('categoryId', params.categoryId);

  const url = `${apiUrl}/public/pros?${queryParams.toString()}`;

  // Fetch des Pros
  let pros: PublicProCard[] = [];
  let error = false;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      pros = await response.json();
    } else {
      error = true;
    }
  } catch (err) {
    console.error('Failed to fetch pros:', err);
    error = true;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Titre */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Professionnels disponibles
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {pros.length} professionnel{pros.length !== 1 ? 's' : ''} trouvé{pros.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Gestion des erreurs */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">
                Une erreur est survenue lors du chargement des professionnels.
              </p>
            </div>
          )}

          {/* Liste vide */}
          {!error && pros.length === 0 && (
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                Aucun professionnel trouvé pour ces critères.
              </p>
            </div>
          )}

          {/* Grille de Pros */}
          {!error && pros.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pros.map((pro) => (
                <ProCard key={pro.id} pro={pro} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
