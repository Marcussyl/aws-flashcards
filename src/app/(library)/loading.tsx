// Scopes to `/` (library home) only — not other root-layout children.
export default function LibraryLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading topic library">
      <section className="max-w-3xl">
        <div className="h-3 w-32 animate-pulse rounded bg-accent/20" />
        <div className="mt-3 h-10 w-72 max-w-full animate-pulse rounded-lg bg-white/10 sm:h-12 sm:w-96" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-white/5" />
        <div className="mt-2 h-4 w-3/4 max-w-lg animate-pulse rounded bg-white/5" />
        <div className="mt-3 h-3 w-40 animate-pulse rounded bg-white/5" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-8 w-8 animate-pulse rounded bg-white/10" />
                <div className="mt-4 h-3 w-28 animate-pulse rounded bg-accent/20" />
                <div className="mt-2 h-7 w-40 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-white/5" />
                <div className="mt-1.5 h-4 w-3/4 animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-6 w-8 shrink-0 animate-pulse rounded-full bg-white/5" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j}>
                  <div className="h-3 w-12 animate-pulse rounded bg-white/5" />
                  <div className="mt-1 h-6 w-8 animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/4 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="mt-3 h-4 w-28 animate-pulse rounded bg-accent/20" />
          </div>
        ))}
      </section>
    </div>
  )
}