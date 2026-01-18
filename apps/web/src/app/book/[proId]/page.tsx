'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { getJSON, postJSON, APIError } from '@/lib/api';

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
  const { user, isAuthenticated, accessToken, logout } = useAuthStore();

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
    if (!selectedSlot || !categoryId || !accessToken) return;

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
        accessToken,
      );

      setSuccessMessage('Réservation envoyée !');
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (error) {
      if (error instanceof APIError) {
        if (error.statusCode === 409) {
          setBookingError('Créneau déjà pris, merci d\'en choisir un autre');
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Redirection...</p>
        </div>
      </div>
    );
  }

  // Vérifier rôle CLIENT
  if (user?.role !== 'CLIENT') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 text-center">
            <span className="text-6xl mb-4 block">⚠️</span>
            <h1 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-4">
              Accès réservé aux clients
            </h1>
            <p className="text-yellow-800 dark:text-yellow-200 mb-6">
              Connectez-vous avec un compte Client pour réserver un rendez-vous.
            </p>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <span className="text-6xl mb-4 block">❌</span>
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4">
              Catégorie de service manquante
            </h1>
            <p className="text-red-800 dark:text-red-200 mb-6">
              Veuillez sélectionner un service avant de réserver.
            </p>
            <button
              onClick={() => router.push('/pros')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <span className="text-6xl mb-4 block">❌</span>
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4">
              {errorPro}
            </h1>
            <button
              onClick={() => router.push('/pros')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <Header />
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Chargement des informations...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-800 dark:text-green-200 font-medium">
              ✅ {successMessage}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Réserver avec {pro?.firstName} {pro?.lastName}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {pro?.city?.name}
          </p>
        </div>

        {/* Date Selection */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
            Choisir une date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            max={maxDate}
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent"
          />
        </div>

        {/* Slots */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-4">
            Créneaux disponibles
          </h2>

          {loadingSlots && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-2"></div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                Chargement des créneaux...
              </p>
            </div>
          )}

          {!loadingSlots && slots.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-600 dark:text-zinc-400">
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
                      ? 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-600'
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
              Confirmer le rendez-vous
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Le {selectedDate} à {selectedSlot} avec {pro?.firstName}{' '}
              {pro?.lastName}
            </p>

            {bookingError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-800 dark:text-red-200 text-sm">
                  {bookingError}
                </p>
              </div>
            )}

            <button
              onClick={handleBooking}
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Envoi en cours...' : 'Valider la réservation'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
