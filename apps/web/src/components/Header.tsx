'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Header
 *
 * Navigation principale du site
 * - Logo + Liens vers Accueil
 * - Non connecté : "Se connecter" + "Devenir Pro"
 * - Connecté : Dropdown menu avec options
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    router.push('/');
  };

  // Fermer le dropdown en cliquant en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Khadamat
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            {/* Masquer "Accueil" si on est déjà sur la page d'accueil */}
            {pathname !== '/' && (
              <Link
                href="/"
                className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition"
              >
                Accueil
              </Link>
            )}

            {/* Affichage conditionnel selon l'état d'authentification */}
            {!isAuthenticated ? (
              <>
                {/* Non connecté */}
                <Link
                  href="/auth/register"
                  className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition"
                >
                  Devenir Pro
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition font-medium"
                >
                  S&apos;inscrire
                </Link>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium"
                >
                  Se connecter
                </Link>
              </>
            ) : (
              <>
                {/* Connecté - Dropdown Menu */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                  >
                    <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-50 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-zinc-50 dark:text-zinc-900">
                        {user?.firstName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium">{user?.firstName}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-2 z-50">
                      {/* Dashboard (PRO uniquement) */}
                      {user?.role === 'PRO' && (
                        <Link
                          href="/dashboard"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                        >
                          <span className="text-lg">📊</span>
                          <span>Tableau de bord</span>
                        </Link>
                      )}

                      {/* Mes Réservations (CLIENT uniquement) */}
                      {user?.role === 'CLIENT' && (
                        <Link
                          href="/client/bookings"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                        >
                          <span className="text-lg">📅</span>
                          <span>Mes Réservations</span>
                        </Link>
                      )}

                      {/* Mon Compte */}
                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                      >
                        <span className="text-lg">👤</span>
                        <span>Mon Compte</span>
                      </Link>

                      {/* Séparateur */}
                      <div className="my-2 border-t border-zinc-200 dark:border-zinc-700"></div>

                      {/* Déconnexion */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <span className="text-lg">🚪</span>
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
