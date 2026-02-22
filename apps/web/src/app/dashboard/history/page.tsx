'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { getJSON } from '@/lib/api';
import type { BookingDashboardItem } from '@khadamat/contracts';

// Types pagination
type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

const LIMIT = 20;

/**
 * Dashboard History Page (PRO)
 *
 * Affiche l'historique paginé des réservations passées (scope=history).
 */
export default function DashboardHistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [bookings, setBookings] = useState<BookingDashboardItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);

  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState(false);

  // Anti-glitch Hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (user?.role !== 'PRO') {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  // Fetch Bookings avec scope=history
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    const fetchBookings = async () => {
      try {
        setLoadingBookings(true);
        setError(false);
        const response = await getJSON<PaginatedResponse<BookingDashboardItem>>(
          `/bookings?scope=history&page=${page}&limit=${LIMIT}`
        );
        setBookings(response.data);
        setMeta(response.meta);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(true);
        setBookings([]);
        setMeta(null);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookings();
  }, [mounted, isAuthenticated, page]);

  // Handler pagination
  const handlePrevious = () => {
    if (meta && meta.hasPrev && page > 1) {
      setPage(page - 1);
    }
  };

  const handleNext = () => {
    if (meta && meta.hasNext) {
      setPage(page + 1);
    }
  };

  const handleRetry = () => {
    setPage(1);
    setError(false);
  };

  // Ne rien afficher avant hydratation
  if (!mounted) {
    return null;
  }

  // Loader pendant redirection
  if (!isAuthenticated || user?.role !== 'PRO') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
          <p className="text-text-secondary">Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Historique
        </h1>
        <p className="text-text-secondary">
          Toutes vos réservations passées
        </p>
      </div>

      {/* Contenu */}
      <div
        className="bg-surface rounded-lg border border-border p-6"
        aria-busy={loadingBookings}
      >
        {/* Loading State */}
        {loadingBookings && (
          <div className="text-center py-12">
            <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg mx-auto mb-2"></div>
            <p className="text-text-secondary text-sm">
              Chargement...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loadingBookings && error && (
          <div role="alert" className="text-center py-12">
            <p className="text-error-600 mb-4 font-medium">
              Impossible de charger l'historique.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-6 py-2 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loadingBookings && !error && bookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">
              Aucun historique pour le moment.
            </p>
          </div>
        )}

        {/* Liste des bookings */}
        {!loadingBookings && !error && bookings.length > 0 && (
          <>
            <div className="space-y-4 mb-6">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start justify-between py-4 border-b border-border last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text-primary">
                        {booking.category.name}
                      </h3>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <p className="text-sm text-text-secondary mb-1">
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
                      <p className="text-sm text-text-secondary">
                        👤 {booking.client.firstName} {booking.client.lastName}
                      </p>
                    )}
                    {booking.duration && booking.duration > 1 && (
                      <p className="text-sm text-text-secondary">
                        ⏱️ Durée: {booking.duration}h
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination UI */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-text-secondary">
                  Page {meta.page} / {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={!meta.hasPrev}
                    className="px-4 py-2 border border-border-strong text-text-primary rounded-lg hover:bg-surface-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!meta.hasNext}
                    className="px-4 py-2 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
