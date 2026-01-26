'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface City {
  id: string;
  name: string;
  slug: string;
}

// ✅ Mise à jour de l'interface pour inclure addressLine
interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityId?: string | null;
  addressLine?: string | null; // ✅ Ajouté grâce au fix backend
}

interface ProProfile {
  userId: string;
  cityId: string;
  city: City;
  whatsapp: string;
  kycStatus: string;
}

interface DashboardResponse {
  user: UserSummary;
  profile: ProProfile;
}

export default function ProfilePage() {
  const router = useRouter();
  const { accessToken, setUser } = useAuthStore(); // Plus besoin de 'user: currentUser' pour le merge
  
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

  // 1. Chargement
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        const [dashboardData, citiesData] = await Promise.all([
          getJSON<DashboardResponse>('/pro/me', accessToken),
          getJSON<City[]>('/public/cities'),
        ]);

        setProfile(dashboardData.profile);
        setCities(citiesData);

        // Priorité à user.cityId
        const truthCityId = dashboardData.user?.cityId || dashboardData.profile?.cityId || '';

        setFormData({
          whatsapp: dashboardData.profile.whatsapp || '',
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
  }, [accessToken]);

  // 2. Sauvegarde Simplifiée
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // A. Update Backend
      await patchJSON('/pro/profile', formData, accessToken || undefined);

      // B. Reload Data (qui contient maintenant l'user COMPLET avec addressLine)
      const dashboardData = await getJSON<DashboardResponse>(
        '/pro/me',
        accessToken || undefined,
      );

      // C. Update Local UI
      setProfile(dashboardData.profile);

      // ✅ D. Update Store (Simple et Propre)
      // Comme le backend renvoie addressLine, on peut écraser le store sans peur.
      if (dashboardData.user) {
        setUser(dashboardData.user);
      }

      // E. Refresh Cache
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
              {/* WhatsApp */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  placeholder="0612345678"
                  required
                />
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
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
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
              {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}
              {success && <div className="text-green-600 bg-green-50 p-3 rounded">{success}</div>}

              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 transition disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
