'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

/**
 * ProBookingCTA
 *
 * Section Call-to-Action pour réserver un Pro
 * Logique conditionnelle selon l'état d'authentification :
 *
 * - Cas A (Non connecté) : "Se connecter pour réserver" → /auth/login
 * - Cas B (Connecté CLIENT) : "Contacter / Réserver" → Action vide pour l'instant
 * - Cas C (Connecté PRO) : Message "Connectez-vous avec un compte Client pour réserver"
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ProBookingCTA() {
  const { user, isAuthenticated } = useAuthStore();

  // Cas A : Non connecté
  if (!isAuthenticated) {
    return (
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-800 dark:to-zinc-900 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Prêt à réserver ce professionnel ?
        </h2>
        <p className="text-zinc-300 mb-6">
          Connectez-vous pour prendre rendez-vous
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-8 py-3 bg-white text-zinc-900 rounded-lg hover:bg-zinc-100 transition font-medium"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  // Cas C : Connecté en tant que PRO
  if (user?.role === 'PRO') {
    return (
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-700 dark:to-orange-700 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Réservation impossible
        </h2>
        <p className="text-amber-100 mb-2">
          Vous êtes connecté avec un compte Professionnel.
        </p>
        <p className="text-amber-100 text-sm">
          Connectez-vous avec un compte Client pour réserver ce service.
        </p>
      </div>
    );
  }

  // Cas B : Connecté en tant que CLIENT
  return (
    <div className="bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-700 dark:to-teal-700 rounded-lg p-8 text-center">
      <h2 className="text-2xl font-bold text-white mb-4">
        Prêt à réserver ce professionnel ?
      </h2>
      <p className="text-green-100 mb-6">
        Bonjour {user?.firstName}, contactez ce professionnel pour réserver
      </p>
      <button
        className="inline-block px-8 py-3 bg-white text-zinc-900 rounded-lg hover:bg-zinc-100 transition font-medium"
        onClick={() => {
          // TODO: Implémenter la logique de réservation
          alert('Fonctionnalité de réservation à venir !');
        }}
      >
        Contacter / Réserver
      </button>
    </div>
  );
}
