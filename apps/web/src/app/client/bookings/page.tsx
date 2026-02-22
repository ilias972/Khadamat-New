'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import { toast } from '@/store/toastStore';
import type { BookingDashboardItem } from '@khadamat/contracts';

type TabType = 'pending' | 'waiting' | 'confirmed' | 'history';

// FIX CRITIQUE: Define pagination types
type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

/**
 * Client Bookings Page
 *
 * Page des réservations CLIENT avec onglets :
 * - En attente (PENDING)
 * - À valider (WAITING_FOR_CLIENT)
 * - Confirmé (CONFIRMED)
 * - Historique (DECLINED, CANCELLED*, COMPLETED, EXPIRED)
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ClientBookingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [bookings, setBookings] = useState<BookingDashboardItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for keyboard navigation
  const tabRefs = useRef<Map<TabType, HTMLButtonElement>>(new Map());

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

  // FIX MEDIUM: Extracting loadBookings as a separate function for retry
  const loadBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      setError(null);
      // FIX CRITIQUE: Use PaginatedResponse type
      const response = await getJSON<PaginatedResponse<BookingDashboardItem>>(`/bookings?page=${page}&limit=20`);
      setBookings(response.data);
      setMeta(response.meta);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Impossible de charger vos réservations. Veuillez réessayer.');
    } finally {
      setLoadingBookings(false);
    }
  }, [page]);

  // Fetch Bookings
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    loadBookings();
  }, [mounted, isAuthenticated, loadBookings]);

  // Cancel booking (CLIENT cancels CONFIRMED booking)
  const handleCancelBooking = useCallback(async (bookingId: string) => {
    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/cancel`, {});

      // FIX CRITIQUE: Use PaginatedResponse type
      const response = await getJSON<PaginatedResponse<BookingDashboardItem>>(`/bookings?page=${page}&limit=20`);
      setBookings(response.data);
      setMeta(response.meta);
      toast.success('Réservation annulée.');
    } catch (err) {
      if (err instanceof APIError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de l\'annulation');
      }
    } finally {
      setUpdatingBooking(null);
      setConfirmCancelId(null);
    }
  }, [page]);

  // Respond to modification (CLIENT accepts/refuses duration change)
  const handleRespondToModification = async (bookingId: string, accept: boolean) => {
    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/respond`, { accept });

      // FIX CRITIQUE: Use PaginatedResponse type
      const response = await getJSON<PaginatedResponse<BookingDashboardItem>>(`/bookings?page=${page}&limit=20`);
      setBookings(response.data);
      setMeta(response.meta);

      if (accept) {
        toast.success('Modification acceptée ! Votre réservation est confirmée.');
      } else {
        toast.info('Modification refusée. La réservation a été annulée.');
      }
    } catch (err) {
      if (err instanceof APIError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de la réponse');
      }
    } finally {
      setUpdatingBooking(null);
    }
  };

  // FIX MEDIUM: Keyboard navigation for tabs
  const tabOrder: TabType[] = ['pending', 'waiting', 'confirmed', 'history'];

  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: TabType) => {
    const currentIndex = tabOrder.indexOf(currentTab);
    let targetIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % tabOrder.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = tabOrder.length - 1;
    }

    if (targetIndex !== currentIndex) {
      const targetTab = tabOrder[targetIndex];
      setActiveTab(targetTab);
      tabRefs.current.get(targetTab)?.focus();
    }
  };

  // Ne rien afficher avant hydratation
  if (!mounted) {
    return null;
  }

  // Loader pendant redirection
  if (!isAuthenticated || user?.role !== 'CLIENT') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {/* FIX LOW: motion-safe:animate-spin */}
          <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
          <p className="text-text-secondary">Redirection...</p>
        </div>
      </div>
    );
  }

  // FIX HIGH: Update status filters
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
    // FIX HIGH: Add CANCELLED_AUTO_OVERLAP, remove CANCELLED_AUTO_FIRST_CONFIRMED
    return [
      'DECLINED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_CLIENT_LATE',
      'CANCELLED_BY_PRO',
      'CANCELLED_AUTO_OVERLAP',
      'COMPLETED',
      'EXPIRED',
    ].includes(booking.status);
  });

  // Helper to format booking datetime for aria-label
  const formatBookingDateTime = (timeSlot: string) => {
    const date = new Date(timeSlot);
    return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Mes Réservations
            </h1>
            <p className="text-text-secondary">
              Gérez et suivez toutes vos réservations
            </p>
          </div>
          {/* FIX RECOMMANDÉ: Refresh button */}
          <button
            onClick={loadBookings}
            disabled={loadingBookings}
            className="px-4 py-2 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Actualiser la liste des réservations"
          >
            Actualiser
          </button>
        </div>

        {/* FIX MEDIUM: Error banner with retry */}
        {error && (
          <div className="mb-6 bg-error-50 border border-error-200 rounded-lg p-4" role="alert">
            <p className="text-error-800 mb-3">{error}</p>
            <button
              onClick={loadBookings}
              disabled={loadingBookings}
              className="px-4 py-2 bg-error-600 text-inverse-text rounded-lg hover:bg-error-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* FIX MEDIUM: ARIA Tabs */}
        <div className="bg-surface rounded-lg border border-border mb-6">
          <div
            role="tablist"
            aria-label="Mes réservations"
            className="flex border-b border-border"
          >
            {/* Tab: En attente */}
            <button
              ref={(el) => { if (el) tabRefs.current.set('pending', el); }}
              role="tab"
              id="tab-pending"
              aria-selected={activeTab === 'pending'}
              aria-controls="panel-pending"
              tabIndex={activeTab === 'pending' ? 0 : -1}
              onClick={() => setActiveTab('pending')}
              onKeyDown={(e) => handleTabKeyDown(e, 'pending')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'pending'
                  ? 'bg-surface-active text-text-primary border-b-2 border-inverse-bg'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              En attente
              <span className="ml-2 px-2 py-0.5 bg-warning-100 text-warning-800 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'PENDING').length}
              </span>
            </button>

            {/* Tab: À valider */}
            <button
              ref={(el) => { if (el) tabRefs.current.set('waiting', el); }}
              role="tab"
              id="tab-waiting"
              aria-selected={activeTab === 'waiting'}
              aria-controls="panel-waiting"
              tabIndex={activeTab === 'waiting' ? 0 : -1}
              onClick={() => setActiveTab('waiting')}
              onKeyDown={(e) => handleTabKeyDown(e, 'waiting')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'waiting'
                  ? 'bg-surface-active text-text-primary border-b-2 border-inverse-bg'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              À valider
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'WAITING_FOR_CLIENT').length}
              </span>
            </button>

            {/* Tab: Confirmé */}
            <button
              ref={(el) => { if (el) tabRefs.current.set('confirmed', el); }}
              role="tab"
              id="tab-confirmed"
              aria-selected={activeTab === 'confirmed'}
              aria-controls="panel-confirmed"
              tabIndex={activeTab === 'confirmed' ? 0 : -1}
              onClick={() => setActiveTab('confirmed')}
              onKeyDown={(e) => handleTabKeyDown(e, 'confirmed')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'confirmed'
                  ? 'bg-surface-active text-text-primary border-b-2 border-inverse-bg'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              Confirmé
              <span className="ml-2 px-2 py-0.5 bg-success-100 text-success-800 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'CONFIRMED').length}
              </span>
            </button>

            {/* Tab: Historique */}
            <button
              ref={(el) => { if (el) tabRefs.current.set('history', el); }}
              role="tab"
              id="tab-history"
              aria-selected={activeTab === 'history'}
              aria-controls="panel-history"
              tabIndex={activeTab === 'history' ? 0 : -1}
              onClick={() => setActiveTab('history')}
              onKeyDown={(e) => handleTabKeyDown(e, 'history')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'history'
                  ? 'bg-surface-active text-text-primary border-b-2 border-inverse-bg'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              Historique
              <span className="ml-2 px-2 py-0.5 bg-surface-active text-text-label rounded-full text-xs">
                {
                  bookings.filter((b) =>
                    [
                      'DECLINED',
                      'CANCELLED_BY_CLIENT',
                      'CANCELLED_BY_CLIENT_LATE',
                      'CANCELLED_BY_PRO',
                      'CANCELLED_AUTO_OVERLAP',
                      'COMPLETED',
                      'EXPIRED',
                    ].includes(b.status),
                  ).length
                }
              </span>
            </button>
          </div>
        </div>

        {/* FIX MEDIUM: Tab panel with ARIA */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="bg-surface rounded-lg border border-border p-6"
        >
          {loadingBookings && (
            <div className="text-center py-12">
              {/* FIX LOW: motion-safe:animate-spin */}
              <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg mx-auto mb-2"></div>
              <p className="text-text-secondary text-sm">
                Chargement...
              </p>
            </div>
          )}

          {!loadingBookings && !error && filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary">
                Aucune réservation dans cette catégorie.
              </p>
            </div>
          )}

          {!loadingBookings && !error && filteredBookings.length > 0 && (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const proName = booking.pro
                  ? `${booking.pro.user.firstName} ${booking.pro.user.lastName}`
                  : 'Professionnel';
                const dateTime = formatBookingDateTime(booking.timeSlot);

                return (
                  /* FIX LOW: Semantic article tag */
                  <article
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
                        {/* FIX MEDIUM: Emoji with aria-hidden */}
                        <span aria-hidden="true">📅</span>{' '}
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
                        <p className="text-sm text-text-secondary">
                          {/* FIX MEDIUM: Emoji with aria-hidden */}
                          <span aria-hidden="true">👤</span> {proName} -{' '}
                          {booking.pro.city.name}
                        </p>
                      )}
                      {/* NOTE: Link to pro profile not available - publicId not in BookingDashboardItem.pro */}
                      {/* Afficher la durée pour WAITING_FOR_CLIENT */}
                      {booking.status === 'WAITING_FOR_CLIENT' && (
                        <div className="mt-3 bg-primary-50 border border-primary-200 rounded-lg p-3">
                          <p className="text-sm text-primary-900 font-medium">
                            {/* FIX MEDIUM: Emoji with aria-hidden */}
                            <span aria-hidden="true">⏱️</span> Le professionnel propose une durée de {booking.duration} heure{booking.duration > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions WAITING_FOR_CLIENT */}
                    {booking.status === 'WAITING_FOR_CLIENT' && (
                      <div className="flex gap-2 ml-4">
                        {/* FIX MEDIUM: aria-label on action buttons */}
                        <button
                          onClick={() => handleRespondToModification(booking.id, true)}
                          disabled={updatingBooking === booking.id}
                          aria-label={`Accepter la modification de durée pour la réservation du ${dateTime}`}
                          className="px-4 py-2 bg-success-600 text-inverse-text rounded-lg hover:bg-success-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => handleRespondToModification(booking.id, false)}
                          disabled={updatingBooking === booking.id}
                          aria-label={`Refuser la modification de durée pour la réservation du ${dateTime}`}
                          className="px-4 py-2 bg-error-600 text-inverse-text rounded-lg hover:bg-error-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Refuser
                        </button>
                      </div>
                    )}

                    {/* Actions CONFIRMED - Annuler */}
                    {booking.status === 'CONFIRMED' && (
                      <div className="flex gap-2 ml-4">
                        {/* FIX MEDIUM: aria-label on action buttons */}
                        <button
                          onClick={() => setConfirmCancelId(booking.id)}
                          disabled={updatingBooking === booking.id}
                          aria-label={`Annuler la réservation du ${dateTime} avec ${proName}`}
                          className="px-4 py-2 bg-error-600 text-inverse-text rounded-lg hover:bg-error-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* PAGINATION: Simple prev/next buttons */}
          {!loadingBookings && !error && meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrev || loadingBookings}
                className="px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <span className="text-sm text-text-secondary">
                Page {meta.page} sur {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={!meta.hasNext || loadingBookings}
                className="px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={confirmCancelId !== null}
          title="Annuler la réservation"
          message="Voulez-vous vraiment annuler cette réservation ?"
          confirmLabel="Annuler la réservation"
          cancelLabel="Retour"
          onConfirm={() => confirmCancelId && handleCancelBooking(confirmCancelId)}
          onCancel={() => setConfirmCancelId(null)}
        />
      </main>
    </div>
  );
}
