import type { ReactNode } from 'react'
import Link from 'next/link'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="text-xl">⚡</span>
            <span>AWS Cert Flashcards</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-slate-300">
            <Link className="hover:text-amber-300" href="/">
              Home
            </Link>
            <Link className="hover:text-amber-300" href="/study">
              Study
            </Link>
            <Link className="hover:text-amber-300" href="/browse">
              Browse
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
