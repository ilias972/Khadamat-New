'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ AJOUT
import { useAuthStore } from '@/store/authStore';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface ProProfile {
  userId: string;
  cityId: string;
  city: City;
  whatsapp: string;
  kycStatus: string;
}

export default function ProfilePage() {
  const router = useRouter(); // ✅ AJOUT
  // ✅ AJOUT : on récupère setUser pour mettre à jour le store global
  const { accessToken, setUser } = useAuthStore();
  
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [formData, setFormData] = useState({
    whatsapp: '',
    cityId: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger le profil et les villes
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        const [dashboardData, citiesData] = await Promise.all([
          getJSON<{ profile: ProProfile }>('/pro/me', accessToken),
          getJSON<City[]>('/public/cities'),
        ]);

        setProfile(dashboardData.profile);
        setCities(citiesData);
        setFormData({
          whatsapp: dashboardData.profile.whatsapp,
          cityId: dashboardData.profile.cityId,
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
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // 1. Mise à jour Backend
      await patchJSON(
        '/pro/profile',
        formData,
        accessToken || undefined,
      );

      // 2. Recharger le profil local (pour le formulaire)
      const dashboardData = await getJSON<{ profile: ProProfile }>(
        '/pro/me',
        accessToken || undefined,
      );
      setProfile(dashboardData.profile);

      // ✅ 3. SYNCHRONISATION CRITIQUE : Mettre à jour le Store Global
      // On récupère l'objet User standard mis à jour pour le store
      const updatedUser = await getJSON<any>('/users/me', accessToken || undefined);
      setUser(updatedUser);

      // ✅ 4. Forcer le rafraîchissement du cache Next.js
      router.refresh();

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Profil
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Modifiez vos informations professionnelles
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Chargement...</p>
          </div>
        )}

        {/* Form */}
        {!loading && profile && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* WhatsApp */}
              <div>
                <label
                  htmlFor="whatsapp"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                  placeholder="0612345678"
                  required
                  pattern="^(06|07)\d{8}$"
                  title="Format: 06XXXXXXXX ou 07XXXXXXXX"
                />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Format: 06XXXXXXXX ou 07XXXXXXXX
                </p>
              </div>

              {/* Ville */}
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
                >
                  <option value="">Sélectionnez une ville</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Ville actuelle: {profile.city.name}
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

              {/* Submit */}
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
