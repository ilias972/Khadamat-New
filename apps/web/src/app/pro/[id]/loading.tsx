import Header from '../../../components/Header';

/**
 * Loading state pour la page de détail d'un Pro
 * Affiche un skeleton pendant le chargement des données
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Skeleton Header */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8">
            <div className="flex items-start gap-6">
              {/* Avatar Skeleton */}
              <div className="w-24 h-24 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>

              {/* Informations Skeleton */}
              <div className="flex-1 space-y-4">
                <div className="h-9 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-3/4 animate-pulse"></div>
                <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Services Skeleton */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-1/3 mb-6 animate-pulse"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-700"
                >
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-1/3 animate-pulse"></div>
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-1/4 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Skeleton */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8">
            <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
