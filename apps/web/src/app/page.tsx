import Link from 'next/link';
import Header from '../components/Header';
import Hero from '../components/Hero';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';

/**
 * Page d'accueil
 *
 * - Header
 * - Hero avec recherche (Ville + Catégorie)
 * - Grille de catégories populaires
 */
export default async function Home() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  // Fetch cities et categories en parallèle
  let cities: PublicCity[] = [];
  let categories: PublicCategory[] = [];

  try {
    const [citiesResponse, categoriesResponse] = await Promise.all([
      fetch(`${apiUrl}/public/cities`, { cache: 'no-store' }),
      fetch(`${apiUrl}/public/categories`, { cache: 'no-store' }),
    ]);

    if (citiesResponse.ok) {
      cities = await citiesResponse.json();
    }

    if (categoriesResponse.ok) {
      categories = await categoriesResponse.json();
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <Hero cities={cities} categories={categories} />

      {/* Catégories populaires */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Catégories populaires
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Explorez les services les plus demandés
            </p>
          </div>

          {/* Grille de catégories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/pros?categoryId=${category.id}`}
                className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 hover:shadow-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition cursor-pointer"
              >
                <div className="text-center space-y-2">
                  <div className="text-4xl">
                    {/* Icons basés sur le nom de la catégorie */}
                    {getCategoryIcon(category.name)}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>© 2026 Khadamat. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Helper pour afficher une icône selon le nom de la catégorie
 */
function getCategoryIcon(name: string): string {
  const icons: Record<string, string> = {
    Plomberie: '🔧',
    Électricité: '⚡',
    Jardinage: '🌱',
    Menuiserie: '🪚',
    Peinture: '🎨',
    Nettoyage: '🧹',
    Climatisation: '❄️',
    Déménagement: '📦',
  };

  return icons[name] || '🔨';
}
