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
    client: { firstName: string; lastName: string; phone: string };
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

  // Fetch Stats (uniquement si Premium)
  useEffect(() => {
    const fetchStats = async () => {
      if (!dashboard || !dashboard.profile.isPremium) return;

      try {
        setLoadingStats(true);
        const data = await getJSON<DashboardStats>('/dashboard/stats');
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [dashboard]);

  // Préparer les données pour le graphique donut (Conversion Rate)
  const conversionData = stats ? [
    { name: 'Confirmé', value: stats.conversionRate.confirmed, color: '#10b981' },
    { name: 'Refusé', value: stats.conversionRate.declined, color: '#ef4444' },
  ] : [];

  // Préparer les données pour le graphique ligne (Requests Count)
  const requestsData = stats?.requestsCount.map((item) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    count: item.count,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
          <div className="bg-surface rounded-lg border border-border p-8 text-center">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ligne : Demandes par jour (7 derniers jours) */}
              <div className="bg-surface rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  📈 Demandes par jour (7 derniers jours)
                </h2>
                {loadingStats ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={requestsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Demandes" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Donut : Taux de conversion */}
              <div className="bg-surface rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  🎯 Taux de conversion
                </h2>
                {loadingStats ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={conversionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
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
                )}
              </div>
            </div>

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
                      📞 {stats.nextBooking.client.phone}
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
