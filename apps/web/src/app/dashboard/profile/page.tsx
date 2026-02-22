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
  const [avatarPreviewFailed, setAvatarPreviewFailed] = useState(false);

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

  useEffect(() => {
    if (!formData.avatarUrl) {
      setAvatarPreviewFailed(false);
    }
  }, [formData.avatarUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const normalizedAvatarUrl =
        formData.avatarUrl.trim() === '' ? null : formData.avatarUrl.trim();
      const payload =
        data?.profile.kycStatus === 'APPROVED'
          ? {
              phone: formData.phone,
              cityId: formData.cityId,
              bio: formData.bio,
              avatarUrl: normalizedAvatarUrl,
            }
          : {
              avatarUrl: normalizedAvatarUrl,
            };

      const response = await patchJSON<{ user: any; profile: any }>(
        '/pro/profile',
        payload,
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
        if (err.message === 'BIO_TOO_LONG') {
          setError(`La bio dépasse la limite (${bioMaxLen} caractères)`);
        } else if (err.message === 'KYC_NOT_APPROVED') {
          setError("Votre KYC doit être approuvé pour modifier ces champs.");
        } else {
          setError(err.message);
        }
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
          <h1 className="text-3xl font-bold text-text-primary">Profil</h1>
          <p className="text-text-secondary mt-2">
            Modifiez vos informations professionnelles
          </p>
        </div>

        {loading && (
          <div className="bg-surface rounded-lg border border-border p-8 text-center">
            <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Chargement...</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Formulaire principal */}
            <div className="bg-surface rounded-lg border border-border p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar URL */}
                <div>
                  <label htmlFor="avatarUrl" className="block text-sm font-medium text-text-label mb-2">
                    Photo de profil (URL)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-border flex-shrink-0 flex items-center justify-center">
                      {formData.avatarUrl && !avatarPreviewFailed ? (
                        <img
                          src={formData.avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={() => setAvatarPreviewFailed(true)}
                        />
                      ) : (
                        <span className="text-2xl text-text-muted">
                          {data.user.firstName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      id="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={(e) => {
                        setAvatarPreviewFailed(false);
                        setFormData({ ...formData, avatarUrl: e.target.value });
                      }}
                      className="flex-1 px-4 py-3 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-text-primary text-text-primary"
                      placeholder="https://exemple.com/photo.jpg"
                    />
                  </div>
                  {!formData.avatarUrl && (
                    <p className="text-sm text-warning-600 mt-1">
                      Photo requise pour accéder au dashboard
                    </p>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-text-label mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-text-primary text-text-primary"
                    placeholder="0612345678"
                    required
                    pattern="^(06|07)\d{8}$"
                    title="Format: 06XXXXXXXX ou 07XXXXXXXX"
                  />
                </div>

                {/* Ville */}
                <div>
                  <label htmlFor="cityId" className="block text-sm font-medium text-text-label mb-2">
                    Ville
                  </label>
                  <select
                    id="cityId"
                    value={formData.cityId}
                    onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-text-primary text-text-primary"
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
                  <label htmlFor="bio" className="block text-sm font-medium text-text-label mb-2">
                    Description / Bio
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    maxLength={bioMaxLen}
                    rows={4}
                    className="w-full px-4 py-3 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-text-primary text-text-primary resize-none"
                    placeholder="Décrivez votre activité et votre expérience..."
                  />
                  <p className="text-sm text-text-muted mt-1">
                    {formData.bio.length}/{bioMaxLen} caractères
                    {!isPremium && ' (Free: 100 max)'}
                  </p>
                </div>

                {/* Messages */}
                {error && (
                  <div
                    className="bg-error-50 border border-error-200 rounded-lg p-4"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-error-800">{error}</p>
                  </div>
                )}
                {success && (
                  <div
                    className="bg-success-50 border border-success-200 rounded-lg p-4"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-success-800">{success}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-6 py-3 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </form>
            </div>

            {/* Portfolio */}
            <div className="bg-surface rounded-lg border border-border p-6">
              <h2 className="text-xl font-bold text-text-primary mb-4">
                Portfolio {!isPremium && <span className="text-sm font-normal text-warning-600 ml-2">Premium uniquement</span>}
              </h2>

              {isPremium ? (
                <>
                  {/* Grid images */}
                  {data.portfolio.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {data.portfolio.map((img) => (
                        <div key={img.id} className="relative group aspect-video rounded-lg overflow-hidden bg-surface-active">
                          <img src={img.url} alt="Portfolio" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeletePortfolio(img.id)}
                            className="absolute top-2 right-2 w-8 h-8 bg-error-600 text-inverse-text rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-sm"
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
                      <label htmlFor="portfolioUrl" className="sr-only">
                        URL de votre réalisation
                      </label>
                      <input
                        type="url"
                        id="portfolioUrl"
                        value={newPortfolioUrl}
                        onChange={(e) => setNewPortfolioUrl(e.target.value)}
                        className="flex-1 px-4 py-2 bg-background border border-border-strong rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary"
                        placeholder="URL de l'image..."
                      />
                      <button
                        onClick={handleAddPortfolio}
                        disabled={!newPortfolioUrl.trim()}
                        className="px-4 py-2 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-text-muted mt-2">{data.portfolio.length}/6 images</p>
                </>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <p className="text-lg mb-2">Fonctionnalité Premium</p>
                  <p className="text-sm">Passez Premium pour ajouter des photos de vos réalisations</p>
                </div>
              )}
            </div>

            {/* Avis */}
            <div className="bg-surface rounded-lg border border-border p-6">
              <h2 className="text-xl font-bold text-text-primary mb-4">
                Avis clients
              </h2>

              <div className="flex items-center gap-4 mb-6">
                <div className="text-3xl font-bold text-text-primary">
                  {data.profile.ratingAvg ?? '-'}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= (data.profile.ratingAvg ?? 0) ? 'text-warning-500' : 'text-border-strong'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-text-muted">
                    {data.profile.ratingCount ?? 0} avis
                  </p>
                </div>
              </div>

              {(data.profile.lastReviews?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  {data.profile.lastReviews!.map((review, idx) => (
                    <div key={idx} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${star <= review.rating ? 'text-warning-500' : 'text-border-strong'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-text-muted">
                          {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-text-label">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">Aucun avis pour le moment</p>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
