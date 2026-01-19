'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import type { BookingDashboardItem } from '@khadamat/contracts';

type TabType = 'pending' | 'confirmed' | 'cancelled';

/**
 * PRO Bookings Page
 *
 * Page des réservations PRO avec onglets :
 * - En attente (PENDING) - avec actions Accept/Refuse
 * - Confirmé (CONFIRMED)
 * - Annulé/Refusé (DECLINED, CANCELLED*)
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ProBookingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [bookings, setBookings] = useState<BookingDashboardItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Anti-glitch Hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard (PRO uniquement)
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
    if (mounted && isAuthenticated && user?.role !== 'PRO') {
      router.push('/client/bookings');
    }
  }, [mounted, isAuthenticated, user, router]);

  // Fetch Bookings
  useEffect(() => {
    if (!mounted || !isAuthenticated || !accessToken) return;

    const fetchBookings = async () => {
      try {
        setLoadingBookings(true);
        const data = await getJSON<BookingDashboardItem[]>('/bookings', accessToken);
        setBookings(data);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setBookings([]);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookings();
  }, [mounted, isAuthenticated, accessToken]);

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

  // Update booking duration (PRO modifies PENDING booking)
  const handleUpdateDuration = async (bookingId: string) => {
    if (!accessToken) return;

    const durationInput = prompt('Nouvelle durée en heures (1-8) :');
    if (!durationInput) return;

    const duration = parseInt(durationInput, 10);
    if (isNaN(duration) || duration < 1 || duration > 8) {
      alert('Veuillez entrer une durée valide entre 1 et 8 heures');
      return;
    }

    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/duration`, { duration }, accessToken);

      // Refresh bookings list
      const data = await getJSON<BookingDashboardItem[]>('/bookings', accessToken);
      setBookings(data);
      alert('Durée modifiée ! Le client doit maintenant valider.');
    } catch (err) {
      if (err instanceof APIError) {
        alert(err.message);
      } else {
        alert('Erreur lors de la modification');
      }
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Complete booking (PRO marks CONFIRMED as COMPLETED)
  const handleCompleteBooking = async (bookingId: string) => {
    if (!accessToken) return;

    if (!confirm('Marquer cette mission comme terminée ?')) {
      return;
    }

    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/complete`, {}, accessToken);

      // Refresh bookings list
      const data = await getJSON<BookingDashboardItem[]>('/bookings', accessToken);
      setBookings(data);
      alert('Mission marquée comme terminée !');
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

  // Ne rien afficher avant hydratation
  if (!mounted) {
    return null;
  }

  // Loader pendant redirection
  if (!isAuthenticated || user?.role !== 'PRO') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Redirection...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Filtrer les bookings selon l'onglet actif
  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === 'pending') {
      return booking.status === 'PENDING';
    }
    if (activeTab === 'confirmed') {
      return booking.status === 'CONFIRMED';
    }
    // cancelled: DECLINED, CANCELLED*
    return [
      'DECLINED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_CLIENT_LATE',
      'CANCELLED_BY_PRO',
      'CANCELLED_AUTO_FIRST_CONFIRMED',
    ].includes(booking.status);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Mes Réservations
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Gérez toutes vos demandes de rendez-vous
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="flex border-b border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'pending'
                  ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
              }`}
            >
              En attente
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'PENDING').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'confirmed'
                  ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
              }`}
            >
              Confirmé
              <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'CONFIRMED').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'cancelled'
                  ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
              }`}
            >
              Annulé / Refusé
              <span className="ml-2 px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full text-xs">
                {
                  bookings.filter((b) =>
                    [
                      'DECLINED',
                      'CANCELLED_BY_CLIENT',
                      'CANCELLED_BY_CLIENT_LATE',
                      'CANCELLED_BY_PRO',
                      'CANCELLED_AUTO_FIRST_CONFIRMED',
                    ].includes(b.status),
                  ).length
                }
              </span>
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          {loadingBookings && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-2"></div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                Chargement...
              </p>
            </div>
          )}

          {!loadingBookings && filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-600 dark:text-zinc-400">
                Aucune réservation dans cette catégorie.
              </p>
            </div>
          )}

          {!loadingBookings && filteredBookings.length > 0 && (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start justify-between py-4 border-b border-zinc-200 dark:border-zinc-700 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {booking.category.name}
                      </h3>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      📅{' '}
                      {new Date(booking.timeSlot).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}{' '}
                      à{' '}
                      {new Date(booking.timeSlot).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {booking.client && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        👤 {booking.client.firstName} {booking.client.lastName} -{' '}
                        {booking.client.phone}
                      </p>
                    )}
                  </div>

                  {/* Actions PENDING */}
                  {booking.status === 'PENDING' && (
                    <div className="flex flex-col gap-2 ml-4">
                      <div className="flex gap-2">
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
                      {/* Bouton Modifier Durée (si pas encore modifié) */}
                      {!booking.isModifiedByPro && (
                        <button
                          onClick={() => handleUpdateDuration(booking.id)}
                          disabled={updatingBooking === booking.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          ⏱️ Modifier Durée
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions CONFIRMED */}
                  {booking.status === 'CONFIRMED' && new Date(booking.timeSlot) < new Date() && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleCompleteBooking(booking.id)}
                        disabled={updatingBooking === booking.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        ✅ Terminer la mission
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
