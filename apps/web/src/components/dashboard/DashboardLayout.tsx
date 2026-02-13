'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { getJSON } from '@/lib/api';
import KycPendingState from './KycPendingState';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [hasAvatar, setHasAvatar] = useState(true); // default true to avoid flash

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

    // PRISON UX : REJECTED pros must stay on /dashboard/kyc
    if (user?.kycStatus === 'REJECTED' && pathname !== '/dashboard/kyc') {
      router.replace('/dashboard/kyc');
      return;
    }

    // Fetch profile to get isPremium + avatarUrl
    const fetchProfile = async () => {
      try {
        const data = await getJSON<{ user: { avatarUrl?: string | null }; profile: { isPremium: boolean } }>('/pro/me');
        setIsPremium(data.profile.isPremium);
        setHasAvatar(!!data.user.avatarUrl);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user, router, pathname]);

  const handleLogout = async () => {
    await logout();
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

  // PRISON UX : Masquer la sidebar si REJECTED
  const isRejected = user?.kycStatus === 'REJECTED';

  // HARD GATE UX : Afficher Waiting Room si PENDING (sauf sur /dashboard/profile)
  const isPending = user?.kycStatus === 'PENDING';
  const allowedPendingPaths = ['/dashboard/profile'];
  const showPendingState = isPending && !allowedPendingPaths.includes(pathname);

  if (showPendingState) {
    return <KycPendingState />;
  }

  // SETUP GATE: Photo obligatoire (sauf sur /dashboard/profile où il peut la définir)
  const showSetupGate = !hasAvatar && pathname !== '/dashboard/profile';

  if (showSetupGate) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex">
        {/* Sidebar still visible */}
        {!isRejected && (
          <aside className="w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard Pro</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    pathname === item.href
                      ? 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        )}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8 max-w-6xl">
            <div className="max-w-lg mx-auto text-center space-y-6 mt-16">
              <div className="w-24 h-24 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">📷</span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Photo de profil requise
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Pour accéder à votre tableau de bord, vous devez d&apos;abord ajouter une photo de profil.
                Cela permet aux clients de vous identifier facilement.
              </p>
              <Link
                href="/dashboard/profile"
                className="inline-block px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium"
              >
                Ajouter ma photo de profil
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
