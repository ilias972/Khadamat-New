'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { getJSON } from '@/lib/api';
import type { BookingDashboardItem } from '@khadamat/contracts';

/**
 * Profile Page
 *
 * Page "Mon Compte" accessible à tous les utilisateurs connectés (CLIENT et PRO).
 * Affiche les informations personnelles de l'utilisateur.
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, accessToken, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [bookings, setBookings] = useState<BookingDashboardItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Anti-glitch Hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard (seulement après hydratation)
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

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

  // Badge rôle
  const getRoleBadge = (role: string) => {
    if (role === 'PRO') {
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100';
    }
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100';
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <main className="container mx-auto px-6 py-16 max-w-4xl">
        {/* Header avec Avatar */}
        <div className="text-center mb-8">
          {/* Avatar */}
          <div className="w-24 h-24 bg-zinc-900 dark:bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-bold text-zinc-50 dark:text-zinc-900">
              {user?.firstName?.charAt(0).toUpperCase()}
              {user?.lastName?.charAt(0).toUpperCase()}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Mon Profil
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Gérez vos informations personnelles
          </p>
        </div>

        <div className="space-y-6">
          {/* Lien Dashboard PRO */}
          {user?.role === 'PRO' && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl">📊</span>
                <h2 className="text-xl font-bold text-white">
                  Tableau de bord Pro
                </h2>
              </div>
              <p className="text-blue-100 mb-4">
                Gérez vos services, horaires et configuration professionnelle
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
              >
                Accéder au tableau de bord →
              </Link>
            </div>
          )}

          {/* Carte Mes Réservations */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Mes Réservations
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
                  Vous n&apos;avez aucune réservation.
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
                      {booking.pro && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          👤 {booking.pro.user.firstName} {booking.pro.user.lastName} - {booking.pro.city.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carte Informations Personnelles */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              Informations personnelles
            </h2>

            <div className="space-y-4">
              {/* Prénom */}
              <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Prénom
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {user?.firstName}
                </span>
              </div>

              {/* Nom */}
              <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Nom
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {user?.lastName}
                </span>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Email
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {user?.email || (
                    <span className="text-zinc-500 dark:text-zinc-400 italic">
                      Non renseigné
                    </span>
                  )}
                </span>
              </div>

              {/* Téléphone */}
              <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Téléphone
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {user?.phone}
                </span>
              </div>

              {/* Rôle */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Rôle
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(user?.role || '')}`}
                >
                  {user?.role === 'PRO' ? 'Professionnel' : 'Client'}
                </span>
              </div>
            </div>
          </div>

          {/* Carte Sécurité */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              Sécurité
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Mot de passe
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Dernière modification : Inconnue
                  </p>
                </div>
                <button
                  disabled
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Changer le mot de passe
                </button>
              </div>
            </div>
          </div>

          {/* Zone Danger */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Zone de danger
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">
                  Déconnexion
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Vous serez redirigé vers la page d&apos;accueil
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition font-medium"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
