// Route-level fallback for /[topic]/study — keep neutral (resume vs new is unknown here).
export default function StudyRouteLoading() {
  return (
    <div
      className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col justify-center gap-4 px-1"
      aria-busy="true"
      aria-label="Loading study"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="min-h-[18rem] rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/5" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/5" />
        <div className="mt-8 h-32 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-11 animate-pulse rounded-full bg-white/10" />
        <div className="h-11 animate-pulse rounded-full bg-accent/20" />
      </div>
    </div>
  )
}
