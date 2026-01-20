'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { getJSON } from '@/lib/api';
import type { BookingDashboardItem } from '@khadamat/contracts';

/**
 * Dashboard History Page (PRO)
 *
 * Affiche l'historique des réservations passées :
 * - COMPLETED
 * - DECLINED
 * - CANCELLED
 * - EXPIRED
 */
export default function DashboardHistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [bookings, setBookings] = useState<BookingDashboardItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Anti-glitch Hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/');
    }
    if (mounted && isAuthenticated && user?.role !== 'PRO') {
      router.push('/');
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

  // Ne rien afficher avant hydratation
  if (!mounted) {
    return null;
  }

  // Loader pendant redirection
  if (!isAuthenticated || user?.role !== 'PRO') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Redirection...</p>
        </div>
      </div>
    );
  }

  // Filtrer uniquement les réservations historiques
  const historyBookings = bookings.filter((booking) =>
    [
      'COMPLETED',
      'DECLINED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_CLIENT_LATE',
      'CANCELLED_BY_PRO',
      'CANCELLED_AUTO_FIRST_CONFIRMED',
      'EXPIRED',
    ].includes(booking.status),
  );

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Historique
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Toutes vos réservations passées
        </p>
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

        {!loadingBookings && historyBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">
              Aucune réservation dans l'historique.
            </p>
          </div>
        )}

        {!loadingBookings && historyBookings.length > 0 && (
          <div className="space-y-4">
            {historyBookings.map((booking) => (
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
                      👤 {booking.client.firstName} {booking.client.lastName}
                    </p>
                  )}
                  {booking.duration && booking.duration > 1 && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      ⏱️ Durée: {booking.duration}h
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
