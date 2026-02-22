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
  id?: string;
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
  id,
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
    'w-full h-12 px-4 bg-input-bg border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer';

  if (error) {
    return (
      <div className="text-sm text-error-600">
        {error}
      </div>
    );
  }

  return (
    <select
      id={id}
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
