'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { postJSON, getJSON, APIError } from '@/lib/api';
import type { RegisterInput, AuthResponse } from '@khadamat/contracts';

/**
 * RegisterForm
 *
 * Formulaire d'inscription avec tabs Client/Pro
 * - Tabs : [Client] vs [Pro]
 * - Champs communs : Prénom, Nom, Email, Phone, Password
 * - Spécifique Pro : Select Ville (chargé via GET /public/cities)
 * - Success : setAuth() + redirect '/'
 * - Error : Affichage message d'erreur
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */

interface City {
  id: string;
  name: string;
  slug: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  // Tab state : 'CLIENT' ou 'PRO'
  const [role, setRole] = useState<'CLIENT' | 'PRO'>('CLIENT');

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    cityId: '', // Uniquement pour PRO
  });

  // Cities pour le select (PRO uniquement)
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // UI states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger les villes au montage du composant
  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const citiesData = await getJSON<City[]>('/public/cities');
        setCities(citiesData);
      } catch (err) {
        console.error('Erreur lors du chargement des villes:', err);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Construire le payload selon le rôle
      const payload: RegisterInput = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role,
        ...(role === 'PRO' && formData.cityId ? { cityId: formData.cityId } : {}),
      };

      const response = await postJSON<AuthResponse>('/auth/register', payload);

      // Success : stocker auth et rediriger
      setAuth(response.user, response.accessToken);
      router.push('/');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Client/Pro */}
      <div className="flex gap-2 border-b border-zinc-300 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setRole('CLIENT')}
          className={`px-6 py-3 font-medium transition ${
            role === 'CLIENT'
              ? 'border-b-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Client
        </button>
        <button
          type="button"
          onClick={() => setRole('PRO')}
          className={`px-6 py-3 font-medium transition ${
            role === 'PRO'
              ? 'border-b-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Professionnel
        </button>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prénom */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Prénom
          </label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="Votre prénom"
            required
          />
        </div>

        {/* Nom */}
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Nom
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="Votre nom"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="exemple@email.com"
            required
          />
        </div>

        {/* Téléphone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Téléphone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="0612345678"
            required
          />
        </div>

        {/* Mot de passe */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Mot de passe
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="••••••••"
            required
          />
        </div>

        {/* Ville (PRO uniquement) */}
        {role === 'PRO' && (
          <div>
            <label
              htmlFor="cityId"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Ville
            </label>
            <select
              id="cityId"
              value={formData.cityId}
              onChange={(e) =>
                setFormData({ ...formData, cityId: e.target.value })
              }
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
              required
              disabled={loadingCities}
            >
              <option value="">
                {loadingCities ? 'Chargement...' : 'Sélectionnez une ville'}
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Bouton Submit */}
        <button
          type="submit"
          disabled={loading || (role === 'PRO' && loadingCities)}
          className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Inscription...' : "S'inscrire"}
        </button>
      </form>
    </div>
  );
}
