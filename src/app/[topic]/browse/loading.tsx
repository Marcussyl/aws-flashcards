export default function BrowseLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading browse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-white/10" />
          <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-white/5" />
        </div>
        <div className="h-10 w-36 shrink-0 animate-pulse rounded-full bg-accent/20" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-12 w-full animate-pulse rounded-xl border border-white/10 bg-slate-900" />
        <div className="h-12 w-full animate-pulse rounded-xl border border-white/10 bg-slate-900 sm:w-44" />
      </div>

      <div className="h-4 w-20 animate-pulse rounded bg-white/5" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-slate-900/80 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-3 w-24 animate-pulse rounded bg-accent/20" />
                <div className="mt-2 h-5 w-full max-w-lg animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-4 w-3/4 max-w-md animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-6 w-14 shrink-0 animate-pulse rounded-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}