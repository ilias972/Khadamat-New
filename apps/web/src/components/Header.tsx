'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Header
 *
 * Navigation principale du site
 * - Logo + Liens vers Accueil
 * - Non connecté : "Se connecter" + "Devenir Pro"
 * - Connecté : "Bonjour [Prénom]" + Bouton Déconnexion
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */
export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

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
            <Link
              href="/"
              className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition"
            >
              Accueil
            </Link>

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
                {/* Connecté */}
                <span className="text-zinc-700 dark:text-zinc-300">
                  Bonjour <span className="font-medium text-zinc-900 dark:text-zinc-50">{user?.firstName}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition font-medium"
                >
                  Déconnexion
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
