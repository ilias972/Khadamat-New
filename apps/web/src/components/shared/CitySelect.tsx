'use client';

import { useState, useEffect } from 'react';
import { getJSON } from '@/lib/api';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface CitySelectProps {
  value: string;
  onChange: (cityId: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * CitySelect
 *
 * Composant réutilisable pour sélectionner une ville.
 * Charge automatiquement la liste des villes depuis l'API.
 *
 * Usage:
 * <CitySelect
 *   value={formData.cityId}
 *   onChange={(cityId) => setFormData({ ...formData, cityId })}
 *   required
 * />
 */
export default function CitySelect({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: CitySelectProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesData = await getJSON<City[]>('/public/cities');
        setCities(citiesData);
      } catch (err) {
        console.error('Erreur lors du chargement des villes:', err);
        setError('Impossible de charger les villes');
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  const baseClassName =
    className ||
    'w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50';

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled || loading}
      className={baseClassName}
    >
      <option value="">
        {loading ? 'Chargement des villes...' : 'Sélectionnez une ville'}
      </option>
      {cities.map((city) => (
        <option key={city.id} value={city.id}>
          {city.name}
        </option>
      ))}
    </select>
  );
}
