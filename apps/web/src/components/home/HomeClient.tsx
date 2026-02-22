'use client';

import { useCallback, useEffect, useState } from 'react';
import { getJSON } from '@/lib/api';
import type { PublicCategory } from '@khadamat/contracts';
import Hero from './Hero';
import Categories from './Categories';
import FeaturedPros from './FeaturedPros';

type CategoriesState = 'loading' | 'ready' | 'empty' | 'error';

export default function HomeClient() {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [categoriesState, setCategoriesState] = useState<CategoriesState>('loading');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setCategoriesState('loading');
    try {
      const data = await getJSON<PublicCategory[]>('/public/categories');
      setCategories(data);
      setCategoriesState(data.length > 0 ? 'ready' : 'empty');
    } catch {
      setCategories([]);
      setCategoriesState('error');
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <>
      <Hero
        categories={categories}
        categoriesState={categoriesState}
        onRetryCategories={fetchCategories}
        onCityChange={setSelectedCityId}
      />
      <Categories
        categories={categories}
        state={categoriesState}
        onRetry={fetchCategories}
        selectedCityId={selectedCityId}
      />
      <FeaturedPros selectedCityId={selectedCityId} />
    </>
  );
}

