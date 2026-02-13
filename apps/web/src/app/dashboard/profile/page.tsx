'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getJSON, patchJSON, postJSON, deleteJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface PortfolioImage {
  id: string;
  url: string;
}

interface ReviewItem {
  id?: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface DashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cityId?: string | null;
    addressLine?: string | null;
    avatarUrl?: string | null;
    city?: { id: string; name: string } | null;
  };
  profile: {
    userId: string;
    cityId: string;
    city: City;
    kycStatus: string;
    isPremium: boolean;
    bio?: string | null;
    ratingAvg?: number | null;
    ratingCount?: number;
    lastReviews?: ReviewItem[];
  };
  services: any[];
  portfolio: PortfolioImage[];
}

export default function ProfilePage() {
  const { setUser, user: currentUser } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [cities, setCities] = useState<City[]>([]);

  const [formData, setFormData] = useState({
    phone: '',
    cityId: '',
    avatarUrl: '',
    bio: '',
  });

  const [newPortfolioUrl, setNewPortfolioUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isPremium = data?.profile?.isPremium ?? false;
  const bioMaxLen = isPremium ? 500 : 100;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, citiesData] = await Promise.all([
          getJSON<DashboardData>('/pro/me'),
          getJSON<City[]>('/public/cities'),
        ]);

        setData(dashboardData);
        setCities(citiesData);

        const truthCityId = dashboardData.user?.cityId || dashboardData.profile?.cityId || '';

        setFormData({
          phone: dashboardData.user.phone || '',
          cityId: truthCityId,
          avatarUrl: dashboardData.user.avatarUrl || '',
          bio: dashboardData.profile.bio || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await patchJSON<{ user: any; profile: any }>(
        '/pro/profile',
        formData,
      );

      setData((prev) =>
        prev
          ? { ...prev, user: response.user, profile: { ...prev.profile, ...response.profile } }
          : prev,
      );

      if (response.user && currentUser) {
        setUser({
          ...currentUser,
          phone: response.user.phone,
          cityId: response.user.cityId,
          city: response.user.city,
          avatarUrl: response.user.avatarUrl,
        });
      }

      setSuccess('Profil mis à jour avec succès !');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message === 'BIO_TOO_LONG' ? `La bio dépasse la limite (${bioMaxLen} caractères)` : err.message);
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddPortfolio = async () => {
    if (!newPortfolioUrl.trim()) return;
    setError('');
    try {
      const img = await postJSON<PortfolioImage>('/pro/portfolio', { url: newPortfolioUrl.trim() });
      setData((prev) =>
        prev ? { ...prev, portfolio: [img, ...prev.portfolio] } : prev,
      );
      setNewPortfolioUrl('');
    } catch (err: any) {
      setError(err.message || 'Erreur ajout image');
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    setError('');
    try {
      await deleteJSON(`/pro/portfolio/${id}`);
      setData((prev) =>
        prev ? { ...prev, portfolio: prev.portfolio.filter((p) => p.id !== id) } : prev,
      );
    } catch (err: any) {
      setError(err.message || 'Erreur suppression image');
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

        {!loading && data && (
          <>
            {/* Formulaire principal */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar URL */}
                <div>
                  <label htmlFor="avatarUrl" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Photo de profil (URL)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 flex items-center justify-center">
                      {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-zinc-500">
                          {data.user.firstName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      id="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                      className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                      placeholder="https://exemple.com/photo.jpg"
                    />
                  </div>
                  {!formData.avatarUrl && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Photo requise pour accéder au dashboard
                    </p>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                    placeholder="0612345678"
                    required
                    pattern="^(06|07)\d{8}$"
                    title="Format: 06XXXXXXXX ou 07XXXXXXXX"
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
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                    required
                  >
                    <option value="">Sélectionnez une ville</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Description / Bio
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    maxLength={bioMaxLen}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 resize-none"
                    placeholder="Décrivez votre activité et votre expérience..."
                  />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {formData.bio.length}/{bioMaxLen} caractères
                    {!isPremium && ' (Free: 100 max)'}
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

            {/* Portfolio */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                Portfolio {!isPremium && <span className="text-sm font-normal text-amber-600 dark:text-amber-400 ml-2">Premium uniquement</span>}
              </h2>

              {isPremium ? (
                <>
                  {/* Grid images */}
                  {data.portfolio.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {data.portfolio.map((img) => (
                        <div key={img.id} className="relative group aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-700">
                          <img src={img.url} alt="Portfolio" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeletePortfolio(img.id)}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-sm"
                            aria-label="Supprimer l'image"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add image */}
                  {data.portfolio.length < 6 && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newPortfolioUrl}
                        onChange={(e) => setNewPortfolioUrl(e.target.value)}
                        className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
                        placeholder="URL de l'image..."
                      />
                      <button
                        onClick={handleAddPortfolio}
                        disabled={!newPortfolioUrl.trim()}
                        className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-zinc-500 mt-2">{data.portfolio.length}/6 images</p>
                </>
              ) : (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  <p className="text-lg mb-2">Fonctionnalité Premium</p>
                  <p className="text-sm">Passez Premium pour ajouter des photos de vos réalisations</p>
                </div>
              )}
            </div>

            {/* Avis */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                Avis clients
              </h2>

              <div className="flex items-center gap-4 mb-6">
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {data.profile.ratingAvg ?? '-'}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= (data.profile.ratingAvg ?? 0) ? 'text-yellow-500' : 'text-zinc-300 dark:text-zinc-600'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {data.profile.ratingCount ?? 0} avis
                  </p>
                </div>
              </div>

              {(data.profile.lastReviews?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  {data.profile.lastReviews!.map((review, idx) => (
                    <div key={idx} className="border-b border-zinc-200 dark:border-zinc-700 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${star <= review.rating ? 'text-yellow-500' : 'text-zinc-300 dark:text-zinc-600'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Aucun avis pour le moment</p>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
