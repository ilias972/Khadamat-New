'use client';

import { create } from 'zustand';
import type { PublicUser } from '@khadamat/contracts';
import { getJSON, postJSON } from '@/lib/api';

interface AuthState {
  user: PublicUser | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthActions {
  init: () => Promise<void>;
  setAuth: (user: PublicUser) => void;
  setUser: (user: PublicUser) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  init: async () => {
    try {
      const user = await getJSON<PublicUser>('/auth/me');
      set({ user, isAuthenticated: true, loading: false });
    } catch {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  setAuth: (user) =>
    set({ user, isAuthenticated: true, loading: false }),

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await postJSON('/auth/logout', {});
    } catch {
      // Best-effort — cookie may already be expired
    }
    set({ user: null, isAuthenticated: false, loading: false });
  },
}));
