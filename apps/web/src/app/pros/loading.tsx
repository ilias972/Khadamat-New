export default function ProsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-16 bg-surface border-b border-border" aria-hidden="true" />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-10 w-96 bg-surface rounded-lg motion-safe:animate-pulse" />
            <div className="h-5 w-48 bg-surface rounded motion-safe:animate-pulse" />
          </div>

          {/* Filters skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-12 bg-surface rounded-lg motion-safe:animate-pulse" />
            <div className="h-12 bg-surface rounded-lg motion-safe:animate-pulse" />
            <div className="h-12 bg-surface rounded-lg motion-safe:animate-pulse" />
          </div>

          {/* Pro cards grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl border border-border p-6 space-y-4"
                aria-hidden="true"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-surface-active motion-safe:animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-32 bg-surface-active rounded motion-safe:animate-pulse" />
                    <div className="h-4 w-24 bg-surface-active rounded motion-safe:animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-surface-active rounded motion-safe:animate-pulse" />
                  <div className="h-4 w-3/4 bg-surface-active rounded motion-safe:animate-pulse" />
                </div>
                <div className="h-10 w-full bg-surface-active rounded-lg motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
