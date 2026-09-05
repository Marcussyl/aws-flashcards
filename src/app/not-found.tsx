import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">This topic is not here</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        That deck does not exist yet. Pick a topic from the library, or add one in JSON.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-fg hover:opacity-90"
      >
        Back to library
      </Link>
    </div>
  )
}
