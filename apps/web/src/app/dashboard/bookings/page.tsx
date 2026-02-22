'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getJSON, patchJSON, APIError } from '@/lib/api';
import { toast } from '@/store/toastStore';
import type { BookingDashboardItem } from '@khadamat/contracts';

type TabType = 'pending' | 'waiting' | 'confirmed' | 'cancelled';

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
 * CustomDialog - Dialog accessible avec children custom
 * Réutilise la logique de ConfirmDialog mais supporte du contenu personnalisé
 */
interface CustomDialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}

function CustomDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: CustomDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-dialog-title"
        className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 shadow-xl motion-safe:animate-in motion-safe:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="custom-dialog-title"
          className="text-xl font-bold text-text-primary mb-4"
        >
          {title}
        </h2>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-border-strong text-text-primary rounded-lg hover:bg-surface-active transition font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 px-4 py-2 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PRO Bookings Page
 *
 * Page des réservations PRO avec onglets :
 * - En attente (PENDING) - avec actions Accept/Refuse
 * - En attente client (WAITING_FOR_CLIENT)
 * - Confirmé (CONFIRMED)
 * - Annulé/Refusé (DECLINED, CANCELLED*)
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ProBookingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [bookings, setBookings] = useState<BookingDashboardItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState<number>(1);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Tabs refs pour navigation clavier
  const tabRefs = useRef<Map<TabType, HTMLButtonElement>>(new Map());
  const tabs: TabType[] = ['pending', 'waiting', 'confirmed', 'cancelled'];

  // Modale de modification de durée
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedBookingForDuration, setSelectedBookingForDuration] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  // Modale d'annulation PRO
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Confirm dialog for complete booking
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);

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

  // Fonction fetch centralisée
  const fetchBookings = useCallback(async (currentPage: number) => {
    try {
      setLoadingBookings(true);
      setError(null);
      const response = await getJSON<PaginatedResponse<BookingDashboardItem>>(
        `/bookings?page=${currentPage}&limit=${LIMIT}`
      );
      setBookings(response.data);
      setMeta(response.meta);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Impossible de charger vos réservations.');
      setBookings([]);
      setMeta(null);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Fetch Bookings au mount et au changement de page
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    fetchBookings(page);
  }, [mounted, isAuthenticated, page, fetchBookings]);

  // Handler retry
  const handleRetry = () => {
    fetchBookings(page);
  };

  // Update booking status
  const handleUpdateStatus = async (bookingId: string, status: 'CONFIRMED' | 'DECLINED') => {
    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/status`, { status });

      // Toast succès
      if (status === 'CONFIRMED') {
        toast.success('Réservation acceptée.');
      } else {
        toast.success('Réservation refusée.');
      }

      // Refresh bookings list
      await fetchBookings(page);
    } catch (err) {
      if (err instanceof APIError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Open duration modal
  const openDurationModal = (bookingId: string) => {
    setSelectedBookingForDuration(bookingId);
    setSelectedDuration(1);
    setShowDurationModal(true);
  };

  // Update booking duration (PRO modifies PENDING booking)
  const handleUpdateDuration = async () => {
    if (!selectedBookingForDuration) return;

    try {
      setUpdatingBooking(selectedBookingForDuration);
      await patchJSON(
        `/bookings/${selectedBookingForDuration}/duration`,
        { duration: selectedDuration },
      );

      // Refresh bookings list
      await fetchBookings(page);
      toast.success('Durée modifiée ! Le client doit maintenant valider.');
      setShowDurationModal(false);
    } catch (err) {
      if (err instanceof APIError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de la modification');
      }
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Open cancel modal
  const openCancelModal = (bookingId: string) => {
    setSelectedBookingForCancel(bookingId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  // Cancel booking (PRO cancels CONFIRMED booking with reason)
  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;
    if (cancelReason.trim().length < 5) {
      toast.warning('Le motif doit contenir au moins 5 caractères');
      return;
    }

    try {
      setUpdatingBooking(selectedBookingForCancel);
      await patchJSON(`/bookings/${selectedBookingForCancel}/cancel`, { reason: cancelReason });

      await fetchBookings(page);
      setShowCancelModal(false);
    } catch (err) {
      if (err instanceof APIError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de l\'annulation');
      }
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Complete booking (PRO marks CONFIRMED as COMPLETED)
  const handleCompleteBooking = useCallback(async (bookingId: string) => {
    try {
      setUpdatingBooking(bookingId);
      await patchJSON(`/bookings/${bookingId}/complete`, {});

      // Refresh bookings list
      await fetchBookings(page);
      toast.success('Mission marquée comme terminée !');
    } catch (err) {
      if (err instanceof APIError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } finally {
      setUpdatingBooking(null);
      setConfirmCompleteId(null);
    }
  }, [page, fetchBookings]);

  // Navigation clavier tabs (ARIA Tabs pattern)
  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: TabType) => {
    const currentIndex = tabs.indexOf(currentTab);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const newTab = tabs[newIndex];
    setActiveTab(newTab);
    tabRefs.current.get(newTab)?.focus();
  };

  // Pagination handlers
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
            <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
            <p className="text-text-secondary">Redirection...</p>
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
    if (activeTab === 'waiting') {
      return booking.status === 'WAITING_FOR_CLIENT';
    }
    if (activeTab === 'confirmed') {
      return booking.status === 'CONFIRMED';
    }
    // cancelled: DECLINED, CANCELLED*, EXPIRED
    return [
      'DECLINED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_CLIENT_LATE',
      'CANCELLED_BY_PRO',
      'CANCELLED_AUTO_FIRST_CONFIRMED',
      'CANCELLED_AUTO_OVERLAP',
      'EXPIRED',
    ].includes(booking.status);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Mes Réservations
          </h1>
          <p className="text-text-secondary mt-2">
            Gérez toutes vos demandes de rendez-vous
          </p>
        </div>

        {/* Tabs - ARIA Tabs pattern */}
        <div className="bg-surface rounded-lg border border-border">
          <div
            role="tablist"
            aria-label="Filtres de réservations"
            className="flex border-b border-border"
          >
            {/* Tab: En attente (PENDING) */}
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
                  : 'text-text-secondary hover:bg-surface-active/50'
              }`}
            >
              En attente
              <span className="ml-2 px-2 py-0.5 bg-warning-100 text-warning-800 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'PENDING').length}
              </span>
            </button>

            {/* Tab: En attente client */}
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
                  : 'text-text-secondary hover:bg-surface-active/50'
              }`}
            >
              En attente client
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
                  : 'text-text-secondary hover:bg-surface-active/50'
              }`}
            >
              Confirmé
              <span className="ml-2 px-2 py-0.5 bg-success-100 text-success-800 rounded-full text-xs">
                {bookings.filter((b) => b.status === 'CONFIRMED').length}
              </span>
            </button>

            {/* Tab: Annulé / Refusé */}
            <button
              ref={(el) => { if (el) tabRefs.current.set('cancelled', el); }}
              role="tab"
              id="tab-cancelled"
              aria-selected={activeTab === 'cancelled'}
              aria-controls="panel-cancelled"
              tabIndex={activeTab === 'cancelled' ? 0 : -1}
              onClick={() => setActiveTab('cancelled')}
              onKeyDown={(e) => handleTabKeyDown(e, 'cancelled')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'cancelled'
                  ? 'bg-surface-active text-text-primary border-b-2 border-inverse-bg'
                  : 'text-text-secondary hover:bg-surface-active/50'
              }`}
            >
              Annulé / Refusé
              <span className="ml-2 px-2 py-0.5 bg-surface-active text-text-primary rounded-full text-xs">
                {
                  bookings.filter((b) =>
                    [
                      'DECLINED',
                      'CANCELLED_BY_CLIENT',
                      'CANCELLED_BY_CLIENT_LATE',
                      'CANCELLED_BY_PRO',
                      'CANCELLED_AUTO_FIRST_CONFIRMED',
                      'CANCELLED_AUTO_OVERLAP',
                      'EXPIRED',
                    ].includes(b.status),
                  ).length
                }
              </span>
            </button>
          </div>
        </div>

        {/* Tab Panel - ARIA pattern */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="bg-surface rounded-lg border border-border p-6"
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
                {error}
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
          {!loadingBookings && !error && filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary">
                Aucune réservation dans cette catégorie.
              </p>
            </div>
          )}

          {/* Liste des bookings */}
          {!loadingBookings && !error && filteredBookings.length > 0 && (
            <>
              <div className="space-y-4 mb-6">
                {filteredBookings.map((booking) => (
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
                            aria-label="Accepter la réservation"
                            className="px-4 py-2 bg-success-600 text-text-inverse rounded-lg hover:bg-success-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            ✅ Accepter
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'DECLINED')}
                            disabled={updatingBooking === booking.id}
                            aria-label="Refuser la réservation"
                            className="px-4 py-2 bg-error-600 text-text-inverse rounded-lg hover:bg-error-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            ❌ Refuser
                          </button>
                        </div>
                        {/* Bouton Modifier Durée (si pas encore modifié) */}
                        {!booking.isModifiedByPro && (
                          <button
                            onClick={() => openDurationModal(booking.id)}
                            disabled={updatingBooking === booking.id}
                            aria-label="Modifier la durée"
                            className="px-4 py-2 bg-info-600 text-text-inverse rounded-lg hover:bg-info-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            ⏱️ Modifier Durée
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions CONFIRMED */}
                    {booking.status === 'CONFIRMED' && (
                      <div className="flex flex-col gap-2 ml-4">
                        {new Date(booking.timeSlot) < new Date() && (
                          <button
                            onClick={() => setConfirmCompleteId(booking.id)}
                            disabled={updatingBooking === booking.id}
                            aria-label="Marquer comme terminée"
                            className="px-4 py-2 bg-success-600 text-text-inverse rounded-lg hover:bg-success-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Terminer la mission
                          </button>
                        )}
                        <button
                          onClick={() => openCancelModal(booking.id)}
                          disabled={updatingBooking === booking.id}
                          aria-label="Annuler la réservation"
                          className="px-4 py-2 bg-error-600 text-text-inverse rounded-lg hover:bg-error-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
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
      </div>

      {/* Dialog: Annulation PRO avec CustomDialog */}
      <CustomDialog
        open={showCancelModal}
        title="Annuler la réservation"
        confirmLabel={updatingBooking ? 'Annulation...' : 'Confirmer l\'annulation'}
        cancelLabel="Retour"
        onConfirm={handleCancelBooking}
        onCancel={() => setShowCancelModal(false)}
        confirmDisabled={updatingBooking !== null || cancelReason.trim().length < 5}
      >
        <div>
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-text-primary mb-2">
            Motif d'annulation
          </label>
          <textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Expliquez la raison de l'annulation (min 5 caractères)"
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 border border-border-strong rounded-lg bg-surface text-text-primary focus:ring-2 focus:ring-inverse-bg focus:border-transparent resize-none"
          />
          <p className="text-xs text-text-muted mt-1">
            {cancelReason.length}/200 caractères
          </p>
        </div>
      </CustomDialog>

      {/* Dialog: Terminer mission avec ConfirmDialog */}
      <ConfirmDialog
        open={confirmCompleteId !== null}
        title="Terminer la mission"
        message="Marquer cette mission comme terminée ?"
        confirmLabel="Terminer"
        cancelLabel="Retour"
        onConfirm={() => confirmCompleteId && handleCompleteBooking(confirmCompleteId)}
        onCancel={() => setConfirmCompleteId(null)}
      />

      {/* Dialog: Modifier Durée avec CustomDialog */}
      <CustomDialog
        open={showDurationModal}
        title="Modifier la durée"
        confirmLabel={updatingBooking ? 'Envoi...' : 'Confirmer'}
        cancelLabel="Annuler"
        onConfirm={handleUpdateDuration}
        onCancel={() => setShowDurationModal(false)}
        confirmDisabled={updatingBooking !== null}
      >
        <div>
          <label htmlFor="booking-duration" className="block text-sm font-medium text-text-primary mb-2">
            Durée (en heures)
          </label>
          <select
            id="booking-duration"
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(parseInt(e.target.value, 10))}
            className="w-full px-4 py-3 border border-border-strong rounded-lg bg-surface text-text-primary focus:ring-2 focus:ring-inverse-bg focus:border-transparent"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => (
              <option key={hours} value={hours}>
                {hours} heure{hours > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-2">
            Le système vérifiera automatiquement la disponibilité des créneaux consécutifs.
          </p>
        </div>
      </CustomDialog>
    </DashboardLayout>
  );
}
