import type { ReactNode } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/12 blur-3xl" />
        <div className="absolute -right-16 top-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%)]" />
      </div>
      <header className="relative z-50 shrink-0 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center text-2xl leading-none">
              ⚡
            </span>
            <span>AWS Cert Flashcards</span>
          </Link>
          <SiteNav />
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}
