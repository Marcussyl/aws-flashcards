/** Route/Suspense fallback shaped like StudySessionPicker (hub), not the card runner. */
export function StudySessionsSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-1 pb-8 sm:px-0"
      aria-busy="true"
      aria-label="Loading study sessions"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="size-8 animate-pulse rounded-lg bg-accent/20" />
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10 sm:h-9 sm:w-56" />
        </div>
        <div className="h-4 max-w-xl animate-pulse rounded bg-white/5 pl-11 sm:h-5" />
        <div className="h-4 max-w-md animate-pulse rounded bg-white/5 pl-11" />
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-accent/15 to-accent/5 p-5">
          <div>
            <div className="mb-4 size-10 animate-pulse rounded-xl bg-accent/25" />
            <div className="h-4 w-28 animate-pulse rounded bg-accent/30" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-white/10" />
          </div>
          <div className="mt-5 h-4 w-20 animate-pulse rounded bg-accent/25" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-5"
          >
            <div>
              <div className="mb-4 size-10 animate-pulse rounded-xl bg-white/10" />
              <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-3 w-36 animate-pulse rounded bg-white/5" />
            </div>
            <div className="mt-5 h-4 w-24 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-white/5" />
          </div>
          <div className="h-4 w-14 animate-pulse rounded bg-white/5" />
        </div>
        <ul className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <li
              key={i}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6"
            >
              <div className="flex items-start gap-3.5 pr-8">
                <div className="size-12 shrink-0 animate-pulse rounded-xl bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-white/5" />
                  </div>
                  <div className="h-3 w-64 max-w-full animate-pulse rounded bg-white/5" />
                  <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-10 animate-pulse rounded bg-white/10" />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-1/4 animate-pulse rounded-full bg-white/10" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
