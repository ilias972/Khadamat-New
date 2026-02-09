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
    'w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all appearance-none cursor-pointer';

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
