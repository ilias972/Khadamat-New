'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

/**
 * Dashboard Profile Page
 *
 * Permet au Pro de modifier son profil :
 * - Téléphone du compte (User.phone) - utilisé pour le login et contact clients
 * - Ville (synchronisé User.cityId + ProProfile.cityId)
 *
 * ⚠️ "use client" OBLIGATOIRE
 */

interface City {
  id: string;
  name: string;
  slug: string;
}

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityId?: string | null;
  addressLine?: string | null;
  city?: { id: string; name: string } | null;
}

interface ProProfile {
  userId: string;
  cityId: string;
  city: City;
  kycStatus: string;
}

interface DashboardResponse {
  user: UserSummary;
  profile: ProProfile;
}

export default function ProfilePage() {
  const { setUser, user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [dashboardUser, setDashboardUser] = useState<UserSummary | null>(null);
  const [cities, setCities] = useState<City[]>([]);

  const [formData, setFormData] = useState({
    phone: '',
    cityId: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Chargement
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, citiesData] = await Promise.all([
          getJSON<DashboardResponse>('/pro/me'),
          getJSON<City[]>('/public/cities'),
        ]);

        setProfile(dashboardData.profile);
        setDashboardUser(dashboardData.user);
        setCities(citiesData);

        // Priorité à user.cityId
        const truthCityId = dashboardData.user?.cityId || dashboardData.profile?.cityId || '';

        setFormData({
          phone: dashboardData.user.phone || '',
          cityId: truthCityId,
        });

      } catch (err) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Erreur lors du chargement');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. Sauvegarde
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // L'API retourne maintenant { user, profile }
      const response = await patchJSON<DashboardResponse>(
        '/pro/profile',
        formData,
      );

      // Mettre à jour le profil local
      setProfile(response.profile);

      // Mettre à jour le user local du dashboard
      setDashboardUser(response.user);

      // IMPORTANT: Mettre à jour le store global avec les données User actualisées
      // Cela synchronise la page /profile avec les changements du dashboard
      if (response.user && currentUser) {
        setUser({
          ...currentUser,
          phone: response.user.phone,
          cityId: response.user.cityId,
          city: response.user.city,
        });
      }

      setSuccess('Profil mis à jour avec succès !');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Profil</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Modifiez vos informations professionnelles
          </p>
        </div>

        {loading && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Chargement...</p>
          </div>
        )}

        {!loading && profile && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Téléphone du compte */}
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
                  pattern="^(06|07)\d{8}$"
                  title="Format: 06XXXXXXXX ou 07XXXXXXXX"
                />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Numéro utilisé pour vous connecter et être contacté par les clients
                </p>
              </div>

              {/* Ville */}
              <div>
                <label htmlFor="cityId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Ville
                </label>
                <select
                  id="cityId"
                  value={formData.cityId}
                  onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                  required
                >
                  <option value="">Sélectionnez une ville</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Ville actuelle : {cities.find(c => c.id === formData.cityId)?.name || 'Aucune'}
                </p>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
