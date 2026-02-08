export default function HeroSkeleton() {
  return (
    <div className="w-full max-w-3xl bg-surface p-2 rounded-[2rem] shadow-xl shadow-primary-500/5 border border-border">
      <div className="flex flex-col md:flex-row items-center gap-2">
        {/* City skeleton */}
        <div className="flex-1 w-full md:w-auto px-6 py-3 border-b md:border-b-0 md:border-r border-border-muted">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-border-muted animate-pulse flex-shrink-0" />
            <div className="flex flex-col gap-1.5 w-full">
              <div className="h-3 w-16 bg-border-muted rounded animate-pulse" />
              <div className="h-6 w-40 bg-border-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Category skeleton */}
        <div className="flex-1 w-full md:w-auto px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-border-muted animate-pulse flex-shrink-0" />
            <div className="flex flex-col gap-1.5 w-full">
              <div className="h-3 w-14 bg-border-muted rounded animate-pulse" />
              <div className="h-6 w-48 bg-border-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Button skeleton */}
        <div className="w-full md:w-auto p-1">
          <div className="h-14 w-full md:w-56 bg-border-muted rounded-[1.5rem] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
