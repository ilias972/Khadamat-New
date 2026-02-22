'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface ProBookingCTAProps {
  proId: string;
  services?: Array<{
    name: string;
    priceFormatted: string;
    categoryId: string;
  }>;
}

/**
 * ProBookingCTA
 *
 * Section Call-to-Action pour réserver un Pro
 * Logique conditionnelle selon l'état d'authentification :
 *
 * - Cas A (Non connecté) : "Se connecter pour réserver" → /auth/login
 * - Cas B (Connecté CLIENT) : "Réserver" → /book/[proId]?categoryId=xxx
 * - Cas C (Connecté PRO) : Message "Connectez-vous avec un compte Client pour réserver"
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function ProBookingCTA({ proId, services }: ProBookingCTAProps) {
  const { user, isAuthenticated } = useAuthStore();

  // Récupérer le categoryId du premier service
  const categoryId = services?.[0]?.categoryId;

  // Cas A : Non connecté
  if (!isAuthenticated) {
    return (
      <div className="bg-gradient-to-r from-inverse-bg to-inverse-hover rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-text-inverse mb-4">
          Prêt à réserver ce professionnel ?
        </h2>
        <p className="text-text-muted mb-6">
          Connectez-vous pour prendre rendez-vous
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-8 py-3 bg-surface text-text-primary rounded-lg hover:bg-surface-active transition font-medium"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  // Cas C : Connecté en tant que PRO
  if (user?.role === 'PRO') {
    return (
      <div className="bg-gradient-to-r from-warning-600 to-primary-600 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-text-inverse mb-4">
          Réservation impossible
        </h2>
        <p className="text-warning-100 mb-2">
          Vous êtes connecté avec un compte Professionnel.
        </p>
        <p className="text-warning-100 text-sm">
          Connectez-vous avec un compte Client pour réserver ce service.
        </p>
      </div>
    );
  }

  // Cas B : Connecté en tant que CLIENT
  // Si pas de categoryId disponible, désactiver le bouton
  if (!categoryId) {
    return (
      <div className="bg-gradient-to-r from-inverse-hover to-inverse-bg rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-text-inverse mb-4">
          Réservation indisponible
        </h2>
        <p className="text-inverse-text mb-2">
          Aucun service actif pour ce professionnel.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-success-600 to-success-700 rounded-lg p-8 text-center">
      <h2 className="text-2xl font-bold text-text-inverse mb-4">
        Prêt à réserver ce professionnel ?
      </h2>
      <p className="text-success-100 mb-6">
        Bonjour {user?.firstName}, choisissez un créneau pour réserver
      </p>
      <Link
        href={`/book/${proId}?categoryId=${categoryId}`}
        className="inline-block px-8 py-3 bg-surface text-text-primary rounded-lg hover:bg-surface-active transition font-medium"
      >
        Réserver maintenant
      </Link>
    </div>
  );
}
