'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { getJSON, postJSON, APIError } from '@/lib/api';
import { toast } from '@/store/toastStore';

/**
 * Booking Page
 *
 * Page Client pour réserver un RDV avec un Pro.
 * - Auth Guard: CLIENT uniquement
 * - Requiert categoryId dans query string
 * - Permet de choisir date et créneau horaire
 * - Envoie la réservation à l'API
 */

interface ProData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: { name: string };
}

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  // Cast safe pour proId (gère string | string[])
  const proIdRaw = params?.proId;
  const proId = Array.isArray(proIdRaw) ? proIdRaw[0] : proIdRaw;

  const categoryId = searchParams.get('categoryId');
  const { user, isAuthenticated, logout } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [pro, setPro] = useState<ProData | null>(null);
  const [loadingPro, setLoadingPro] = useState(true);
  const [errorPro, setErrorPro] = useState<string | null>(null);

  // Date selection
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // Slots
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Booking submission
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Anti-glitch Hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  // Vérifier que categoryId est présent
  useEffect(() => {
    if (mounted && !categoryId) {
      setErrorPro('Catégorie de service manquante');
    }
  }, [mounted, categoryId]);

  // Fetch Pro data
  useEffect(() => {
    if (!mounted || !proId) return;

    const fetchPro = async () => {
      try {
        setLoadingPro(true);
        const data = await getJSON<ProData>(`/public/pros/${proId}`);
        setPro(data);
        setErrorPro(null);
      } catch (error) {
        console.error('Error fetching pro:', error);
        setErrorPro('Professionnel non trouvé');
      } finally {
        setLoadingPro(false);
      }
    };

    fetchPro();
  }, [mounted, proId]);

  // Fetch Slots when date or categoryId changes
  useEffect(() => {
    if (!mounted || !proId || !categoryId || !selectedDate) return;

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const queryParams = new URLSearchParams({
          proId: proId,
          date: selectedDate,
          categoryId: categoryId,
        });
        const data = await getJSON<string[]>(
          `/public/slots?${queryParams.toString()}`,
        );
        setSlots(data);
      } catch (error) {
        console.error('Error fetching slots:', error);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [mounted, proId, categoryId, selectedDate]);

  // Handle booking submission
  const handleBooking = async () => {
    if (!selectedSlot || !categoryId) return;

    try {
      setSubmitting(true);
      setBookingError(null);

      await postJSON(
        '/bookings',
        {
          proId: proId,
          categoryId: categoryId,
          date: selectedDate,
          time: selectedSlot,
        },
      );

      setSuccessMessage('Réservation envoyée !');
      // NE PAS rediriger automatiquement - afficher l'écran de succès
    } catch (error) {
      if (error instanceof APIError) {
        if (error.statusCode === 409) {
          setBookingError('Créneau déjà pris, merci d\'en choisir un autre');
        } else if (error.statusCode === 400 && error.message === 'CITY_REQUIRED') {
          toast.warning('Veuillez sélectionner votre ville dans votre profil');
          router.push('/profile');
          return;
        } else if (error.statusCode === 400 && error.message === 'CITY_MISMATCH') {
          setBookingError('Ce professionnel n\'intervient pas dans votre ville. Vérifiez votre profil.');
          setTimeout(() => {
            router.push('/profile');
          }, 3000);
          return;
        } else if (error.statusCode === 400 && error.message === 'ADDRESS_REQUIRED') {
          toast.warning('Veuillez renseigner votre adresse dans votre profil');
          router.push('/profile');
          return;
        } else if (error.statusCode === 403) {
          setBookingError('Ce professionnel n\'est pas disponible à la réservation.');
        } else {
          setBookingError(error.message || 'Erreur lors de la réservation');
        }
      } else {
        setBookingError('Erreur lors de la réservation');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Ne rien afficher avant hydratation
  if (!mounted) {
    return null;
  }

  // Loader pendant redirection
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
          <p className="text-text-secondary">Redirection...</p>
        </div>
      </div>
    );
  }

  // Vérifier rôle CLIENT
  if (user?.role !== 'CLIENT') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-8 text-center">
            <span className="text-6xl mb-4 block">⚠️</span>
            <h1 className="text-2xl font-bold text-warning-900 mb-4">
              Accès réservé aux clients
            </h1>
            <p className="text-warning-800 mb-6">
              Connectez-vous avec un compte Client pour réserver un rendez-vous.
            </p>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-warning-600 text-white rounded-lg hover:bg-warning-700 transition font-medium"
            >
              Se déconnecter
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Erreur categoryId manquant
  if (!categoryId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="bg-error-50 border border-error-200 rounded-lg p-8 text-center">
            <span className="text-6xl mb-4 block">❌</span>
            <h1 className="text-2xl font-bold text-error-900 mb-4">
              Catégorie de service manquante
            </h1>
            <p className="text-error-800 mb-6">
              Veuillez sélectionner un service avant de réserver.
            </p>
            <button
              onClick={() => router.push('/pros')}
              className="px-6 py-3 bg-error-600 text-white rounded-lg hover:bg-error-700 transition font-medium"
            >
              Retour aux professionnels
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Erreur lors du chargement du Pro
  if (errorPro) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="bg-error-50 border border-error-200 rounded-lg p-8 text-center">
            <span className="text-6xl mb-4 block">❌</span>
            <h1 className="text-2xl font-bold text-error-900 mb-4">
              {errorPro}
            </h1>
            <button
              onClick={() => router.push('/pros')}
              className="px-6 py-3 bg-error-600 text-white rounded-lg hover:bg-error-700 transition font-medium"
            >
              Retour aux professionnels
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Loading Pro
  if (loadingPro) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
            <p className="text-text-secondary">
              Chargement des informations...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        {/* Success Screen - Flux WhatsApp */}
        {successMessage ? (
          <div className="bg-surface rounded-lg border border-border p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Demande envoyée avec succès !
              </h1>
              <p className="text-text-secondary">
                Votre réservation a été envoyée à {pro?.firstName} {pro?.lastName}
              </p>
            </div>

            {/* Détails réservation */}
            <div className="bg-background rounded-lg p-4 mb-6">
              <p className="text-sm text-text-secondary mb-2">
                📅 {selectedDate} à {selectedSlot}
              </p>
              <p className="text-sm text-text-secondary">
                📍 {pro?.city?.name}
              </p>
            </div>

            {/* Action principale - WhatsApp */}
            {(() => {
              // Nettoyage : garde uniquement les chiffres
              const cleanPhone = (pro?.phone ?? '').replace(/[^\d]/g, '');

              // Encoder le message pour l'URL
              const message = `Bonjour, je viens de réserver un créneau le ${selectedDate} à ${selectedSlot}. Je souhaite discuter des détails.`;
              const encodedMessage = encodeURIComponent(message);

              // Lien valide uniquement si > 6 chiffres
              const whatsappUrl = cleanPhone.length > 6
                ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
                : null;

              if (whatsappUrl) {
                return (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-success-600 text-text-inverse rounded-lg hover:bg-success-700 transition font-medium mb-3"
                  >
                    <span className="text-xl">💬</span>
                    Discuter sur WhatsApp
                  </a>
                );
              } else {
                return (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-border-strong text-text-muted rounded-lg cursor-not-allowed font-medium mb-3"
                  >
                    <span className="text-xl">💬</span>
                    Numéro indisponible
                  </button>
                );
              }
            })()}

            {/* Action secondaire */}
            <button
              onClick={() => router.push('/client/bookings')}
              className="w-full px-6 py-3 border border-border-strong text-text-primary rounded-lg hover:bg-surface-active transition font-medium"
            >
              Voir mes réservations
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Réserver avec {pro?.firstName} {pro?.lastName}
              </h1>
              <p className="text-text-secondary">
                {pro?.city?.name}
              </p>
            </div>

        {/* Date Selection */}
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Choisir une date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            max={maxDate}
            className="w-full px-4 py-3 border border-border-strong rounded-lg bg-input-bg text-text-primary focus:ring-2 focus:ring-inverse-bg focus:border-transparent"
          />
        </div>

        {/* Slots */}
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">
            Créneaux disponibles
          </h2>

          {loadingSlots && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-inverse-bg mx-auto mb-2"></div>
              <p className="text-text-secondary text-sm">
                Chargement des créneaux...
              </p>
            </div>
          )}

          {!loadingSlots && slots.length === 0 && (
            <div className="text-center py-8">
              <p className="text-text-secondary">
                Aucun créneau disponible ce jour
              </p>
            </div>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    selectedSlot === slot
                      ? 'bg-inverse-bg text-inverse-text'
                      : 'bg-surface-active text-text-primary hover:bg-border'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation */}
        {selectedSlot && (
          <div className="bg-info-50 border border-info-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-info-900 mb-2">
              Confirmer le rendez-vous
            </h3>
            <p className="text-info-800 mb-4">
              Le {selectedDate} à {selectedSlot} avec {pro?.firstName}{' '}
              {pro?.lastName}
            </p>

            {bookingError && (
              <div className="mb-4 bg-error-50 border border-error-200 rounded-lg p-3">
                <p className="text-error-800 text-sm">
                  {bookingError}
                </p>
              </div>
            )}

            <button
              onClick={handleBooking}
              disabled={submitting}
              className="w-full px-6 py-3 bg-info-600 text-text-inverse rounded-lg hover:bg-info-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Envoi en cours...' : 'Valider la réservation'}
            </button>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
