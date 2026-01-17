'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicCity, PublicCategory } from '@khadamat/contracts';

interface HeroProps {
  cities: PublicCity[];
  categories: PublicCategory[];
}

/**
 * Hero
 *
 * Section principale de la page d'accueil
 * - Titre + Selects pour Ville et Catégorie + Bouton Rechercher
 */
export default function Hero({ cities, categories }: HeroProps) {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCity) params.append('cityId', selectedCity);
    if (selectedCategory) params.append('categoryId', selectedCategory);

    router.push(`/pros?${params.toString()}`);
  };

  return (
    <section className="bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 py-20">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Titre */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-50">
              Trouvez votre expert
            </h1>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              Marketplace marocaine de services à la demande
            </p>
          </div>

          {/* Formulaire de recherche */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Ville */}
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Ville
                </label>
                <select
                  id="city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                >
                  <option value="">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Catégorie */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Service
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                >
                  <option value="">Tous les services</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bouton Rechercher */}
            <button
              onClick={handleSearch}
              className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium text-lg"
            >
              Rechercher
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
