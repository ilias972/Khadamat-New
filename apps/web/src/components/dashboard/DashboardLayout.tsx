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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
          <p className="text-text-secondary">Chargement...</p>
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
      <div className="min-h-screen bg-background flex">
        {/* Sidebar still visible */}
        {!isRejected && (
          <aside className="w-64 bg-surface border-r border-border flex flex-col">
            <div className="p-6 border-b border-border">
              <h1 className="text-xl font-bold text-text-primary">Dashboard Pro</h1>
              <p className="text-sm text-text-secondary mt-1">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <nav className="flex-1 p-4 space-y-1" aria-label="Navigation du tableau de bord">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? 'bg-inverse-bg text-inverse-text font-medium'
                        : 'text-text-label hover:bg-surface-active'
                    }`}
                  >
                    <span className="text-xl" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8 max-w-6xl">
            <div className="max-w-lg mx-auto text-center space-y-6 mt-16">
              <div className="w-24 h-24 bg-surface-active rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">📷</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                Photo de profil requise
              </h2>
              <p className="text-text-secondary">
                Pour accéder à votre tableau de bord, vous devez d&apos;abord ajouter une photo de profil.
                Cela permet aux clients de vous identifier facilement.
              </p>
              <Link
                href="/dashboard/profile"
                className="inline-block px-6 py-3 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium"
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (masquée si REJECTED) */}
      {!isRejected && (
        <aside className="w-64 bg-surface border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-bold text-text-primary">
              Dashboard Pro
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {user?.firstName} {user?.lastName}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" aria-label="Navigation du tableau de bord">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-inverse-bg text-inverse-text font-medium'
                      : 'text-text-label hover:bg-surface-active'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <Link
              href="/"
              className="block w-full px-4 py-2 text-center border border-border-strong text-text-primary rounded-lg hover:bg-surface-active transition"
            >
              ← Retour au site
            </Link>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-error-600 text-text-inverse rounded-lg hover:bg-error-700 transition"
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
