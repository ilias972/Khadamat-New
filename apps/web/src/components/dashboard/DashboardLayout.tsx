'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { APIError, getJSON } from '@/lib/api';
import KycPendingState from './KycPendingState';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProMe {
  user: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
  };
  profile: {
    isPremium: boolean;
    kycStatus: KycStatus;
    premiumActiveUntil?: string | null;
    boostActiveUntil?: string | null;
  };
}

interface DashboardContextValue {
  proMe: ProMe | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const defaultDashboardContext: DashboardContextValue = {
  proMe: null,
  loading: false,
  error: '',
  refresh: async () => {},
};

const DashboardContext = createContext<DashboardContextValue>(defaultDashboardContext);

export const useDashboardContext = () => useContext(DashboardContext);

interface SidebarItem {
  href: string;
  label: string;
  icon: string;
}

interface DashboardSidebarProps {
  pathname: string;
  menuItems: SidebarItem[];
  firstName?: string;
  lastName?: string;
  onLogout: () => Promise<void>;
}

function DashboardSidebar({
  pathname,
  menuItems,
  firstName,
  lastName,
  onLogout,
}: DashboardSidebarProps) {
  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col" aria-label="Menu latéral">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary">Dashboard Pro</h1>
        <p className="text-sm text-text-secondary mt-1">
          {firstName} {lastName}
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg ${
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

      <div className="p-4 border-t border-border space-y-2">
        <Link
          href="/"
          className="block w-full px-4 py-2 text-center border border-border-strong text-text-primary rounded-lg hover:bg-surface-active motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg"
        >
          ← Retour au site
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="w-full px-4 py-2 bg-error-600 text-text-inverse rounded-lg hover:bg-error-700 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

function DashboardLoader({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="text-center" role="status">
        <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4" />
        <p className="text-text-secondary">{message}</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading: authLoading, logout, setUser } = useAuthStore();

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [proMe, setProMe] = useState<ProMe | null>(null);
  const proMeCacheRef = useRef<ProMe | null>(null);

  const refreshProMe = useCallback(async (force = false) => {
    if (!force && proMeCacheRef.current) {
      setProMe(proMeCacheRef.current);
      return;
    }

    try {
      setProfileLoading(true);
      setProfileError('');
      const data = await getJSON<ProMe>('/pro/me');
      proMeCacheRef.current = data;
      setProMe(data);
    } catch (err) {
      if (err instanceof APIError) {
        setProfileError(err.message || 'Erreur lors du chargement du profil professionnel.');
      } else {
        setProfileError('Erreur lors du chargement du profil professionnel.');
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    if (user?.role !== 'PRO') {
      router.replace('/');
      return;
    }

    void refreshProMe();
  }, [authLoading, isAuthenticated, user?.role, router, refreshProMe]);

  useEffect(() => {
    if (!proMe || !user) return;

    const nextKycStatus = proMe.profile.kycStatus;
    const nextPremium = proMe.profile.isPremium;
    const nextAvatar = proMe.user.avatarUrl ?? null;

    const mustSync =
      user.kycStatus !== nextKycStatus ||
      user.isPremium !== nextPremium ||
      (user.avatarUrl ?? null) !== nextAvatar;

    if (!mustSync) return;

    setUser({
      ...user,
      kycStatus: nextKycStatus,
      isPremium: nextPremium,
      avatarUrl: nextAvatar,
    });
  }, [proMe, user, setUser]);

  const effectiveKycStatus: KycStatus | undefined =
    proMe?.profile.kycStatus || (user?.kycStatus as KycStatus | undefined);
  const effectiveHasAvatar =
    proMe?.user.avatarUrl !== undefined
      ? Boolean(proMe.user.avatarUrl)
      : Boolean(user?.avatarUrl);
  const effectiveIsPremium = proMe?.profile.isPremium ?? Boolean(user?.isPremium);

  useEffect(() => {
    if (authLoading || !isAuthenticated || user?.role !== 'PRO') return;

    if (effectiveKycStatus === 'REJECTED' && pathname !== '/dashboard/kyc') {
      router.replace('/dashboard/kyc');
    }
  }, [authLoading, isAuthenticated, user?.role, effectiveKycStatus, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'PRO') return;
    if (effectiveKycStatus !== 'PENDING') return;

    const interval = setInterval(() => {
      void refreshProMe(true);
    }, 30_000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.role, effectiveKycStatus, refreshProMe]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const menuItems: SidebarItem[] = useMemo(
    () => [
      ...(effectiveIsPremium
        ? [{ href: '/dashboard', label: "Vue d'ensemble", icon: '📊' }]
        : []),
      { href: '/dashboard/bookings', label: 'Réservations', icon: '📅' },
      { href: '/dashboard/history', label: 'Historique', icon: '📋' },
      { href: '/dashboard/subscription', label: 'Abonnement', icon: '📊' },
      { href: '/dashboard/profile', label: 'Profil', icon: '👤' },
      { href: '/dashboard/services', label: 'Services', icon: '🔧' },
      { href: '/dashboard/availability', label: 'Disponibilités', icon: '⏰' },
      { href: '/dashboard/kyc', label: 'KYC', icon: '🛡️' },
    ],
    [effectiveIsPremium],
  );

  const contextValue = useMemo(
    () => ({
      proMe,
      loading: profileLoading,
      error: profileError,
      refresh: () => refreshProMe(true),
    }),
    [proMe, profileLoading, profileError, refreshProMe],
  );

  if (authLoading) {
    return <DashboardLoader message="Chargement de la session..." />;
  }

  if (!isAuthenticated || user?.role !== 'PRO') {
    return <DashboardLoader message="Redirection..." />;
  }

  if (!proMe && profileLoading) {
    return <DashboardLoader message="Chargement du tableau de bord..." />;
  }

  if (effectiveKycStatus === 'REJECTED' && pathname !== '/dashboard/kyc') {
    return <DashboardLoader message="Redirection vers la vérification KYC..." />;
  }

  const isPendingAllowedPath =
    pathname === '/dashboard/profile' || pathname === '/dashboard/subscription' || pathname.startsWith('/dashboard/subscription/');
  const showPendingState = effectiveKycStatus === 'PENDING' && !isPendingAllowedPath;

  if (showPendingState) {
    return (
      <DashboardContext.Provider value={contextValue}>
        <KycPendingState />
      </DashboardContext.Provider>
    );
  }

  const isRejected = effectiveKycStatus === 'REJECTED';
  const showSetupGate = !effectiveHasAvatar && pathname !== '/dashboard/profile';

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background flex">
        <a
          href="#dashboard-main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-surface focus:text-text-primary focus:shadow-lg"
        >
          Aller au contenu principal
        </a>

        {!isRejected && (
          <DashboardSidebar
            pathname={pathname}
            menuItems={menuItems}
            firstName={proMe?.user.firstName || user?.firstName}
            lastName={proMe?.user.lastName || user?.lastName}
            onLogout={handleLogout}
          />
        )}

        <main
          id="dashboard-main"
          aria-label="Contenu du tableau de bord"
          className={`flex-1 overflow-auto ${isRejected ? 'w-full' : ''}`}
        >
          <div className="container mx-auto px-6 py-8 max-w-6xl">
            {profileError && (
              <div role="alert" className="mb-6 bg-error-50 border border-error-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p className="text-error-800">{profileError}</p>
                <button
                  type="button"
                  onClick={() => void refreshProMe(true)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-error-300 text-error-800 bg-surface hover:bg-error-100 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500"
                >
                  Réessayer
                </button>
              </div>
            )}

            {showSetupGate ? (
              <div className="max-w-lg mx-auto text-center space-y-6 mt-16">
                <div className="w-24 h-24 bg-surface-active rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl" aria-hidden="true">📷</span>
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
                  className="inline-block px-6 py-3 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover motion-safe:transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg"
                >
                  Ajouter ma photo de profil
                </Link>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
