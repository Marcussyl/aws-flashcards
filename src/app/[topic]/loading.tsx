export default function TopicDashboardLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading topic dashboard">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-10">
        <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-9 w-full max-w-xl animate-pulse rounded-lg bg-white/10 sm:h-12" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-white/5" />
        <div className="mt-2 h-4 w-3/4 max-w-md animate-pulse rounded bg-white/5" />
        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <div className="h-11 w-full animate-pulse rounded-full bg-accent/20 sm:w-36" />
          <div className="h-11 w-full animate-pulse rounded-full bg-white/10 sm:w-28" />
          <div className="h-11 w-full animate-pulse rounded-full bg-white/10 sm:w-28" />
          <div className="h-11 w-full animate-pulse rounded-full bg-white/10 sm:w-32" />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:p-5"
          >
            <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-8 w-10 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="h-6 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="h-7 w-7 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-5 w-36 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-3 w-full animate-pulse rounded bg-white/5" />
                  <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded bg-white/5" />
                </div>
                <div className="h-6 w-8 shrink-0 animate-pulse rounded-full bg-white/5" />
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-white/10" />
              </div>
              <div className="mt-2 h-3 w-16 animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}