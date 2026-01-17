import Link from 'next/link';

/**
 * Header
 *
 * Navigation principale du site
 * - Logo + Liens vers Accueil, Devenir Pro, Connexion
 */
export default function Header() {
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
            <Link
              href="/devenir-pro"
              className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition"
            >
              Devenir Pro
            </Link>
            <Link
              href="/connexion"
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium"
            >
              Connexion
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
