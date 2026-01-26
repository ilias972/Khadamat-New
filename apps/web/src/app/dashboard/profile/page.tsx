'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

// Typage précis pour éviter les 'any' (Recommandation GPT)
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
  // On ne met pas addressLine ici car /pro/me ne le renvoie pas forcément
}

interface ProProfile {
  userId: string;
  cityId: string; // Gardé pour rétrocompatibilité, mais on utilise user.cityId
  city: City;
  whatsapp: string;
  kycStatus: string;
}

interface DashboardResponse {
  user: UserSummary; // L'objet User (Source de vérité pour Ville/Tel)
  profile: ProProfile; // L'objet Profile (Source de vérité pour WhatsApp)
}

export default function ProfilePage() {
  const router = useRouter();
  
  // ✅ ON RÉCUPÈRE LE USER ACTUEL DU STORE
  // Cela nous permet de garder l'adresse (addressLine) qui est déjà stockée
  const { accessToken, setUser, user: currentUser } = useAuthStore();
  
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

  // 1. Chargement initial
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

        // ✅ SOURCE DE VÉRITÉ : USER
        // On prend la ville du User en priorité absolue.
        // Si user.cityId est null, on fallback sur le profile (migration), sinon vide.
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

  // 2. Sauvegarde
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // A. Mise à jour Backend
      // On suppose que le backend met à jour User ET ProProfile (fix Claude précédent)
      await patchJSON(
        '/pro/profile',
        formData,
        accessToken || undefined,
      );

      // B. Récupération des données fraîches
      const dashboardData = await getJSON<DashboardResponse>(
        '/pro/me',
        accessToken || undefined,
      );

      // C. Mise à jour UI locale
      setProfile(dashboardData.profile);

      // ✅ D. MISE À JOUR INTELLIGENTE DU STORE (MERGE)
      // C'est ICI qu'on règle le bug de l'adresse disparue.
      // On prend le user actuel (qui a l'adresse) et on fusionne avec les nouvelles infos (ville, tel).
      if (currentUser && dashboardData.user) {
        setUser({
          ...currentUser,          // Garde : addressLine, role, etc.
          ...dashboardData.user,   // Met à jour : cityId, phone, firstName
        });
      } else if (dashboardData.user) {
        // Fallback si le store était vide (peu probable ici)
        setUser(dashboardData.user);
      }

      // E. Refresh pour être sûr que Next.js invalide ses caches serveur
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Profil
          </h1>
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
              
              {/* WhatsApp (Spécifique Pro) */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                  placeholder="0612345678"
                  required
                  pattern="^(06|07)\d{8}$"
                />
              </div>

              {/* Ville (Source: User) */}
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
                   {/* Affichage intelligent basé sur le state actuel du formulaire */}
                  Ville sélectionnée : {cities.find(c => c.id === formData.cityId)?.name || 'Aucune'}
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
