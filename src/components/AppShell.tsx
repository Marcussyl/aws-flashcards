'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AmbientBackdrop } from '@/components/AmbientBackdrop'
import { MemoriMark } from '@/components/MemoriMark'
import { SiteNav } from '@/components/SiteNav'
import { TopicSwitcher } from '@/components/TopicSwitcher'
import { topicFromPath } from '@/data/topics'
import { ProgressProvider } from '@/lib/progress'
import { TaxonomyProvider, useTaxonomy } from '@/lib/taxonomy'
import { APP_VERSION } from '@/lib/version'

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const topicId = topicFromPath(pathname)
  const { accentFor, getTopic } = useTaxonomy()
  const accents = accentFor(topicId)
  const topic = topicId ? getTopic(topicId) : undefined

  return (
    <ProgressProvider>
      <div
        data-topic={topicId ?? 'library'}
        style={
          {
            '--accent': accents.accent,
            '--accent-fg': accents.accentFg,
          } as CSSProperties
        }
        className="relative flex h-dvh min-w-0 flex-col overflow-x-hidden overflow-y-hidden bg-slate-950 text-slate-100"
      >
        <AmbientBackdrop />
        <header className="relative z-50 shrink-0 border-b border-white/10 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
                <MemoriMark className="size-7 text-accent" title="Memori" />
                <span>Memori</span>
              </Link>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                v{APP_VERSION}
              </span>
              {topicId && topic ? (
                <div className="hidden min-w-0 sm:block">
                  <TopicSwitcher topicId={topicId} />
                </div>
              ) : null}
            </div>
            <SiteNav topicId={topicId} />
          </div>
        </header>
        <main className="mx-auto flex min-h-0 min-w-0 w-full max-w-6xl flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
      </div>
    </ProgressProvider>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TaxonomyProvider>
      <ShellInner>{children}</ShellInner>
    </TaxonomyProvider>
  )
}
