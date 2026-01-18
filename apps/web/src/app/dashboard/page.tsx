'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

/**
 * Dashboard Overview Page
 *
 * Page d'accueil du dashboard Pro.
 * Affiche un résumé : Nom, Statut KYC, Ville, Statistiques de base.
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
    premiumActiveUntil: string | null;
    boostActiveUntil: string | null;
  };
  services: any[];
  availability: any[];
}

export default function DashboardOverviewPage() {
  const { accessToken } = useAuthStore();
  const [dashboard, setDashboard] = useState<ProDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!accessToken) return;

      try {
        const data = await getJSON<ProDashboard>('/pro/me', accessToken);
        setDashboard(data);
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
  }, [accessToken]);

  const kycStatusLabels: Record<string, { label: string; color: string }> = {
    NOT_SUBMITTED: { label: 'Non soumis', color: 'bg-gray-100 text-gray-800' },
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Vue d&apos;ensemble
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Bienvenue sur votre dashboard professionnel
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Chargement de vos données...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Dashboard Data */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Informations personnelles */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                👤 Informations
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Nom complet
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {dashboard.user.firstName} {dashboard.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Email
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {dashboard.user.email || 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Téléphone
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {dashboard.user.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Profil Pro */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                🏢 Profil Pro
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Ville
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {dashboard.profile.city.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    WhatsApp
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {dashboard.profile.whatsapp}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Statut KYC
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      kycStatusLabels[dashboard.profile.kycStatus]?.color ||
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {kycStatusLabels[dashboard.profile.kycStatus]?.label ||
                      dashboard.profile.kycStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Statistiques */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                📊 Statistiques
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Services actifs
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {dashboard.services.filter((s) => s.isActive).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Services total
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {dashboard.services.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Jours travaillés
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {dashboard.availability.filter((a) => a.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
