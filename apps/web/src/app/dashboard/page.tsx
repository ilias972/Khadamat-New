'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import type { BookingDashboardItem } from '@khadamat/contracts';

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
  const [bookings, setBookings] = useState<BookingDashboardItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);

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

  // Fetch Bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!accessToken) return;

      try {
        setLoadingBookings(true);
        const data = await getJSON<BookingDashboardItem[]>('/bookings', accessToken);
        setBookings(data);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookings();
  }, [accessToken]);

  // Update booking status
  const handleUpdateStatus = async (bookingId: string, status: 'CONFIRMED' | 'DECLINED') => {
    if (!accessToken) return;

    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/status`, { status }, accessToken);

      // Refresh bookings list
      const data = await getJSON<BookingDashboardItem[]>('/bookings', accessToken);
      setBookings(data);
    } catch (err) {
      if (err instanceof APIError) {
        alert(err.message);
      } else {
        alert('Erreur lors de la mise à jour');
      }
    } finally {
      setUpdatingBooking(null);
    }
  };

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
          <>
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

          {/* Demandes de Rendez-vous */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 mt-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
              📅 Demandes de Rendez-vous
            </h2>

            {loadingBookings && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-2"></div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  Chargement...
                </p>
              </div>
            )}

            {!loadingBookings && bookings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-zinc-600 dark:text-zinc-400">
                  Aucune demande de rendez-vous.
                </p>
              </div>
            )}

            {!loadingBookings && bookings.length > 0 && (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-700 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {booking.category.name}
                        </h3>
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        📅 {new Date(booking.timeSlot).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })} à {new Date(booking.timeSlot).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {booking.client && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          👤 {booking.client.firstName} {booking.client.lastName} - {booking.client.phone}
                        </p>
                      )}
                    </div>

                    {/* Actions (visible uniquement si PENDING) */}
                    {booking.status === 'PENDING' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'CONFIRMED')}
                          disabled={updatingBooking === booking.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          ✅ Accepter
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(booking.id, 'DECLINED')}
                          disabled={updatingBooking === booking.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          ❌ Refuser
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
