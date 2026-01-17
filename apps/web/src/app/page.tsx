export default async function Home() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  let status = {
    isOnline: false,
    cities: 0,
    timestamp: '',
  };

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok) {
        status = {
          isOnline: true,
          cities: data.cities || 0,
          timestamp: data.timestamp || '',
        };
      }
    }
  } catch (error) {
    console.error('Failed to fetch API health:', error);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Khadamat Marketplace
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Marketplace marocaine de services à la demande
            </p>
          </div>

          {/* API Status Card */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                API Status
              </h2>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {status.isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
            </div>

            {status.isOnline && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-600 dark:text-zinc-400">Cities</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                    {status.cities}
                  </span>
                </div>
                {status.timestamp && (
                  <div className="flex justify-between py-2 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-600 dark:text-zinc-400">Last check</span>
                    <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {new Date(status.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {!status.isOnline && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400 py-2 border-t border-zinc-200 dark:border-zinc-700">
                L'API backend n'est pas accessible. Assurez-vous que le serveur tourne sur le port 3001.
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
            <p>Frontend: Next.js 16 • Backend: NestJS • Database: PostgreSQL</p>
          </div>
        </div>
      </main>
    </div>
  );
}
