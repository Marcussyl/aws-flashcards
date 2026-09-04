import type { ReactNode } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-8">
        {children}
      </main>
    </div>
  )
}
