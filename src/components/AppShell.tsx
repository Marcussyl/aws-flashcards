import type { ReactNode } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="relative z-50 shrink-0 border-b border-white/10 bg-slate-950/80 backdrop-blur">
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
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}
