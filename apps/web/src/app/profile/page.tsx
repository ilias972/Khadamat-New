'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { getJSON, patchJSON } from '@/lib/api';

/**
 * Profile Page
 *
 * Page "Mon Compte" accessible à tous les utilisateurs connectés (CLIENT et PRO).
 * Permet de modifier les informations personnelles (Nom, Prénom, Adresse).
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, accessToken, logout, setUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Formulaire de modification
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cityId, setCityId] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Liste des villes
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCities, setLoadingCities] = useState(true);

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

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        const data = await getJSON<Array<{ id: string; name: string; slug: string }>>('/public/cities');
        setCities(data);
      } catch (error) {
        console.error('Error fetching cities:', error);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  // Initialiser le formulaire avec les données de l'utilisateur
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setCityId(user.cityId || '');
      setAddressLine(user.addressLine || '');
    }
  }, [user]);

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!accessToken) return;

    try {
      setIsSaving(true);
      setSuccessMessage('');

      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cityId: cityId || undefined,
        addressLine: addressLine.trim(),
      };

      const updatedUser = await patchJSON('/users/me', data, accessToken);

      // Mettre à jour les données utilisateur dans le store
      setUser(updatedUser);

      setSuccessMessage('Profil mis à jour avec succès');
      setIsEditing(false);

      // Effacer le message après 3 secondes
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  // Annuler la modification
  const handleCancel = () => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setCityId(user.cityId || '');
      setAddressLine(user.addressLine || '');
    }
    setIsEditing(false);
  };

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

          {/* Lien Mes Réservations (CLIENT) */}
          {user?.role === 'CLIENT' && (
            <div className="bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-700 dark:to-teal-700 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl">📅</span>
                <h2 className="text-xl font-bold text-white">
                  Mes Réservations
                </h2>
              </div>
              <p className="text-green-100 mb-4">
                Consultez et gérez toutes vos réservations
              </p>
              <Link
                href="/client/bookings"
                className="inline-block px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-green-50 transition font-medium"
              >
                Voir mes réservations →
              </Link>
            </div>
          )}

          {/* Carte Informations Personnelles */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Informations personnelles
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium"
                >
                  Modifier
                </button>
              )}
            </div>

            {/* Message de succès */}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                  ✅ {successMessage}
                </p>
              </div>
            )}

            {!isEditing ? (
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

                {/* Ville */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Ville
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {user?.cityId ? (
                      cities.find((c) => c.id === user.cityId)?.name || 'Chargement...'
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400 italic">
                        Non renseigné
                      </span>
                    )}
                  </span>
                </div>

                {/* Adresse */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Adresse précise
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {user?.addressLine || (
                      <span className="text-zinc-500 dark:text-zinc-400 italic">
                        Non renseigné
                      </span>
                    )}
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
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="space-y-4"
              >
                {/* Prénom */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent"
                  />
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent"
                  />
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                    Ville
                  </label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    required
                    disabled={loadingCities}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Sélectionnez votre ville</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adresse précise */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                    Adresse précise
                  </label>
                  <input
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent"
                    placeholder="Rue, Numéro..."
                  />
                </div>

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
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
