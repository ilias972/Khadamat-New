'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getJSON } from '@/lib/api';
import type { PublicUser } from '@khadamat/contracts';

/**
 * AuthBootstrap
 *
 * Composant de bootstrap d'authentification
 * - Ne rend rien visuellement (return null)
 * - Restaure la session au chargement de la page
 * - Vérifie la validité du token via GET /auth/me
 *
 * ⚠️ "use client" OBLIGATOIRE (utilise useEffect et authStore)
 */
export default function AuthBootstrap() {
  const { accessToken, setUser, logout } = useAuthStore();

  useEffect(() => {
    // Si aucun token en store, rien à faire
    if (!accessToken) {
      return;
    }

    // Vérifier la validité du token
    const verifyToken = async () => {
      try {
        const user = await getJSON<PublicUser>('/auth/me', accessToken);
        // Token valide : mettre à jour le user
        setUser(user);
      } catch (error) {
        // Token invalide ou expiré : déconnecter
        console.error('Token invalide, déconnexion automatique');
        logout();
      }
    };

    verifyToken();
  }, []); // Exécuté une seule fois au mount

  return null; // Ne rend rien
}
