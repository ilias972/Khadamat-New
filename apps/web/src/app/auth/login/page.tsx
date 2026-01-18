import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';

/**
 * Page : /auth/login
 *
 * Page de connexion
 * - Affiche le LoginForm
 * - Lien vers inscription
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Connexion
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Accédez à votre compte Khadamat
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Lien vers inscription */}
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Pas encore de compte ?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
              >
                S&apos;inscrire
              </Link>
            </p>
          </div>
        </div>

        {/* Retour accueil */}
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
