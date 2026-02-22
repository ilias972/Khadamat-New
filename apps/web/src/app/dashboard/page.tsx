'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Dashboard Overview Page
 *
 * Page d'accueil du dashboard Pro (PREMIUM UNIQUEMENT).
 * Affiche des KPIs : Demandes par jour, Taux de conversion, Prochaine réservation.
 *
 * ⚠️ "use client" OBLIGATOIRE
 */

interface ProDashboard {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    role: string;
  };
  profile: {
    userId: string;
    cityId: string;
    city: {
      id: string;
      name: string;
      slug: string;
    };
    whatsapp: string;
    kycStatus: string;
    isPremium: boolean;
    premiumActiveUntil: string | null;
    boostActiveUntil: string | null;
  };
  services: any[];
  availability: any[];
}

interface DashboardStats {
  requestsCount: Array<{ date: string; count: number }>;
  conversionRate: { confirmed: number; declined: number };
  pendingCount: number;
  nextBooking: {
    client: { firstName: string; lastName: string };
    timeSlot: string;
    category: { name: string };
  } | null;
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ProDashboard | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [error, setError] = useState('');

  // Fetch Dashboard
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getJSON<ProDashboard>('/pro/me');
        setDashboard(data);

        // Si non premium, rediriger vers /dashboard/bookings
        if (!data.profile.isPremium) {
          router.replace('/dashboard/bookings');
        }
      } catch (err) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Erreur lors du chargement du dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  const fetchStats = async () => {
    if (!dashboard || !dashboard.profile.isPremium) return;

    try {
      setLoadingStats(true);
      setStatsError('');
      const data = await getJSON<DashboardStats>('/dashboard/stats');
      setStats(data);
    } catch (err) {
      if (err instanceof APIError) {
        if (
          err.statusCode === 403 &&
          typeof err.message === 'string' &&
          err.message.includes('PREMIUM_REQUIRED')
        ) {
          router.replace('/dashboard/bookings');
          return;
        }
        setStatsError(err.message || 'Impossible de charger les statistiques.');
      } else {
        setStatsError('Impossible de charger les statistiques.');
      }
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Stats (uniquement si Premium)
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard]);

  // Préparer les données pour le graphique donut (Conversion Rate)
  const conversionData = stats ? [
    { name: 'Confirmé', value: stats.conversionRate.confirmed, color: 'var(--color-success-500)' },
    { name: 'Refusé', value: stats.conversionRate.declined, color: 'var(--color-error-500)' },
  ] : [];

  // Préparer les données pour le graphique ligne (Requests Count)
  const requestsData = stats?.requestsCount.map((item) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    count: item.count,
  })) || [];

  const requestsFallbackText = requestsData.length > 0
    ? `Demandes sur 7 jours : ${requestsData.map((item) => `${item.date} ${item.count}`).join(', ')}.`
    : 'Aucune donnée pour le moment.';

  const conversionFallbackText = stats
    ? `Réservations confirmées: ${stats.conversionRate.confirmed}. Réservations refusées: ${stats.conversionRate.declined}.`
    : 'Aucune donnée pour le moment.';

  return (
    <DashboardLayout>
      <div className="space-y-6" aria-busy={loading || loadingStats} aria-live="polite">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Vue d&apos;ensemble
          </h1>
          <p className="text-text-secondary mt-2">
            Tableau de bord Premium - Statistiques et KPIs
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-surface rounded-lg border border-border p-8 text-center" role="status">
            <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
            <p className="text-text-secondary">
              Chargement de vos données...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">{error}</p>
          </div>
        )}

        {/* Dashboard Data (Premium uniquement) */}
        {dashboard && dashboard.profile.isPremium && (
          <>
            {statsError && (
              <div role="alert" className="bg-error-50 border border-error-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p className="text-error-800">{statsError}</p>
                <button
                  type="button"
                  onClick={fetchStats}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-error-300 text-error-800 bg-surface hover:bg-error-100 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Cartes KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Demandes en attente */}
              <div className="bg-surface rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-text-secondary">
                    Demandes en attente
                  </p>
                  <span className="text-2xl">⏳</span>
                </div>
                <p className="text-4xl font-bold text-text-primary">
                  {loadingStats ? '...' : stats?.pendingCount || 0}
                </p>
              </div>

              {/* Confirmés */}
              <div className="bg-surface rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-text-secondary">
                    Réservations confirmées
                  </p>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-4xl font-bold text-success-600">
                  {loadingStats ? '...' : stats?.conversionRate.confirmed || 0}
                </p>
              </div>

              {/* Refusés */}
              <div className="bg-surface rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-text-secondary">
                    Réservations refusées
                  </p>
                  <span className="text-2xl">❌</span>
                </div>
                <p className="text-4xl font-bold text-error-600">
                  {loadingStats ? '...' : stats?.conversionRate.declined || 0}
                </p>
              </div>
            </div>

            {/* Graphiques */}
            <section aria-label="Statistiques de performance" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ligne : Demandes par jour (7 derniers jours) */}
              <figure className="bg-surface rounded-lg border border-border p-6">
                <figcaption className="text-lg font-semibold text-text-primary mb-4">
                  📈 Demandes par jour (7 derniers jours)
                </figcaption>
                {loadingStats ? (
                  <div className="flex items-center justify-center h-64" role="status">
                    <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg"></div>
                  </div>
                ) : requestsData.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-10">
                    Aucune donnée pour le moment.
                  </p>
                ) : (
                  <>
                    <div role="img" aria-label="Graphique des demandes reçues sur les 7 derniers jours">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={requestsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="var(--color-primary-600)" name="Demandes" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-text-secondary mt-3">{requestsFallbackText}</p>
                  </>
                )}
              </figure>

              {/* Donut : Taux de conversion */}
              <figure className="bg-surface rounded-lg border border-border p-6">
                <figcaption className="text-lg font-semibold text-text-primary mb-4">
                  🎯 Taux de conversion
                </figcaption>
                {loadingStats ? (
                  <div className="flex items-center justify-center h-64" role="status">
                    <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg"></div>
                  </div>
                ) : conversionData.every((entry) => entry.value === 0) ? (
                  <p className="text-sm text-text-secondary text-center py-10">
                    Aucune donnée pour le moment.
                  </p>
                ) : (
                  <>
                    <div role="img" aria-label="Graphique circulaire du taux de conversion des réservations">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={conversionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="var(--color-primary-500)"
                            dataKey="value"
                            label
                          >
                            {conversionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-text-secondary mt-3">{conversionFallbackText}</p>
                  </>
                )}
              </figure>
            </section>

            {/* Prochaine réservation */}
            <div className="bg-surface rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                📅 Prochaine réservation
              </h2>
              {loadingStats ? (
                <div className="text-center py-8">
                  <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg mx-auto"></div>
                </div>
              ) : stats?.nextBooking ? (
                <div className="flex items-center gap-4">
                  <div className="bg-info-100 rounded-full p-4">
                    <span className="text-3xl">👤</span>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">
                      {stats.nextBooking.client.firstName} {stats.nextBooking.client.lastName}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {stats.nextBooking.category.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      Contact disponible dans la réservation
                    </p>
                    <p className="text-sm text-info-600 mt-1">
                      📅 {new Date(stats.nextBooking.timeSlot).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })} à {new Date(stats.nextBooking.timeSlot).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-text-secondary py-8">
                  Aucune réservation confirmée à venir
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
