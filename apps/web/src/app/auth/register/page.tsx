import Link from 'next/link';
import RegisterForm from '@/components/auth/RegisterForm';

/**
 * Page : /auth/register
 *
 * Page d'inscription
 * - Affiche le RegisterForm avec tabs Client/Pro
 * - Lien vers connexion
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Inscription
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Rejoignez la communauté Khadamat
            </p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Lien vers connexion */}
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Déjà un compte ?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
              >
                Se connecter
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
