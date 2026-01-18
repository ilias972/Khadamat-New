'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicUser } from '@khadamat/contracts';

/**
 * AuthStore
 *
 * Store Zustand pour gérer l'authentification
 * Persisté dans localStorage pour maintenir la session après refresh
 *
 * ⚠️ "use client" OBLIGATOIRE car utilise localStorage
 */

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setAuth: (user: PublicUser, accessToken: string) => void;
  setUser: (user: PublicUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // State
      user: null,
      accessToken: null,
      isAuthenticated: false,

      // Actions
      setAuth: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
        }),

      setUser: (user) =>
        set({
          user,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'khadamat-auth', // Clé localStorage
      // Sérialisation sélective : on ne persiste que user et accessToken
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: !!state.accessToken,
      }),
    },
  ),
);
