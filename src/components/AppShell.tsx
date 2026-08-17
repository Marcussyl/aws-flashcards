import type { ReactNode } from 'react'
import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/study', label: 'Study' },
  { href: '/browse', label: 'Browse' },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center text-2xl leading-none">
              ⚡
            </span>
            <span>AWS Cert Flashcards</span>
          </Link>
          <nav className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 text-sm text-slate-300 sm:flex sm:w-auto sm:gap-1 sm:bg-transparent sm:p-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-center hover:bg-white/10 hover:text-amber-300 sm:px-4"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-8">
        {children}
      </main>
    </div>
  )
}
