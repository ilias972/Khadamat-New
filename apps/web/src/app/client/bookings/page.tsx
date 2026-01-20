'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import type { BookingDashboardItem } from '@khadamat/contracts';

type TabType = 'pending' | 'waiting' | 'confirmed' | 'history';

/**
 * Client Bookings Page
 *
 * Page des réservations CLIENT avec onglets :
 * - En attente (PENDING)
 * - Confirmé (CONFIRMED)
 * - Historique (DECLINED, CANCELLED*, COMPLETED, EXPIRED)
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ClientBookingsPage() {
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

  // Auth Guard (CLIENT uniquement)
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
    if (mounted && isAuthenticated && user?.role !== 'CLIENT') {
      router.push('/dashboard');
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

  // Respond to modification (CLIENT accepts/refuses duration change)
  const handleRespondToModification = async (bookingId: string, accept: boolean) => {
    if (!accessToken) return;

    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/respond`, { accept }, accessToken);

      // Refresh bookings list
      const data = await getJSON<BookingDashboardItem[]>('/bookings', accessToken);
      setBookings(data);

      if (accept) {
        alert('Modification acceptée ! Votre réservation est confirmée.');
      } else {
        alert('Modification refusée. La réservation a été annulée.');
      }
    } catch (err) {
      if (err instanceof APIError) {
        alert(err.message);
      } else {
        alert('Erreur lors de la réponse');
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
  if (!isAuthenticated || user?.role !== 'CLIENT') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Redirection...</p>
        </div>
      </div>
    );
  }

  // Filtrer les bookings selon l'onglet actif
  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === 'pending') {
      return booking.status === 'PENDING';
    }
    if (activeTab === 'waiting') {
      return booking.status === 'WAITING_FOR_CLIENT';
    }
    if (activeTab === 'confirmed') {
      return booking.status === 'CONFIRMED';
    }
    // history: DECLINED, CANCELLED*, COMPLETED, EXPIRED
    return [
      'DECLINED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_CLIENT_LATE',
      'CANCELLED_BY_PRO',
      'CANCELLED_AUTO_FIRST_CONFIRMED',
      'COMPLETED',
      'EXPIRED',
    ].includes(booking.status);
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Mes Réservations
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Gérez et suivez toutes vos réservations
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-6">
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
              onClick={() => setActiveTab('waiting')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'waiting'
                  ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
              }`}
            >
              À valider
              <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'WAITING_FOR_CLIENT').length}
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
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'history'
                  ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
              }`}
            >
              Historique
              <span className="ml-2 px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full text-xs">
                {
                  bookings.filter((b) =>
                    [
                      'DECLINED',
                      'CANCELLED_BY_CLIENT',
                      'CANCELLED_BY_CLIENT_LATE',
                      'CANCELLED_BY_PRO',
                      'CANCELLED_AUTO_FIRST_CONFIRMED',
                      'COMPLETED',
                      'EXPIRED',
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
                    {booking.pro && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        👤 {booking.pro.user.firstName} {booking.pro.user.lastName} -{' '}
                        {booking.pro.city.name}
                      </p>
                    )}
                    {/* Afficher la durée pour WAITING_FOR_CLIENT */}
                    {booking.status === 'WAITING_FOR_CLIENT' && (
                      <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <p className="text-sm text-orange-900 dark:text-orange-100 font-medium">
                          ⏱️ Le professionnel propose une durée de {booking.duration} heure{booking.duration > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions WAITING_FOR_CLIENT */}
                  {booking.status === 'WAITING_FOR_CLIENT' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleRespondToModification(booking.id, true)}
                        disabled={updatingBooking === booking.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        ✅ Accepter
                      </button>
                      <button
                        onClick={() => handleRespondToModification(booking.id, false)}
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
      </main>
    </div>
  );
}
