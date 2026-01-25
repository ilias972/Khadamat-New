'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { getJSON } from '@/lib/api';

/**
 * DashboardLayout
 *
 * Layout pour la zone protégée du dashboard Pro.
 *
 * Fonctionnalités :
 * - Auth Guard : Vérifie que l'utilisateur est authentifié et a le rôle PRO
 * - Sidebar avec navigation
 * - Redirection automatique si non autorisé
 *
 * ⚠️ "use client" OBLIGATOIRE
 */

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, accessToken, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  // Auth Guard + Prison UX + Fetch isPremium
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    if (user?.role !== 'PRO') {
      router.push('/');
      return;
    }

    // 🔒 PRISON UX : REJECTED pros must stay on /dashboard/kyc
    if (user?.kycStatus === 'REJECTED' && pathname !== '/dashboard/kyc') {
      router.replace('/dashboard/kyc');
      return;
    }

    // Fetch profile to get isPremium
    const fetchProfile = async () => {
      if (!accessToken) return;

      try {
        const data = await getJSON<{ profile: { isPremium: boolean } }>('/pro/me', accessToken);
        setIsPremium(data.profile.isPremium);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user, router, accessToken, pathname]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Menu items (conditionnel selon isPremium)
  const menuItems = [
    // Vue d'ensemble uniquement si Premium
    ...(isPremium ? [{ href: '/dashboard', label: "Vue d'ensemble", icon: '📊' }] : []),
    { href: '/dashboard/bookings', label: 'Réservations', icon: '📅' },
    { href: '/dashboard/history', label: 'Historique', icon: '📋' },
    { href: '/dashboard/profile', label: 'Profil', icon: '👤' },
    { href: '/dashboard/services', label: 'Services', icon: '🔧' },
    { href: '/dashboard/availability', label: 'Disponibilités', icon: '⏰' },
  ];

  // Loader pendant la vérification auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // 🔒 PRISON UX : Masquer la sidebar si REJECTED
  const isRejected = user?.kycStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex">
      {/* Sidebar (masquée si REJECTED) */}
      {!isRejected && (
        <aside className="w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Dashboard Pro
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {user?.firstName} {user?.lastName}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
            <Link
              href="/"
              className="block w-full px-4 py-2 text-center border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
            >
              ← Retour au site
            </Link>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition"
            >
              Déconnexion
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isRejected ? 'w-full' : ''}`}>
        <div className="container mx-auto px-6 py-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
