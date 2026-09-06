'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AmbientBackdrop } from '@/components/AmbientBackdrop'
import { MemoriMark } from '@/components/MemoriMark'
import { SiteNav } from '@/components/SiteNav'
import { TopicSwitcher } from '@/components/TopicSwitcher'
import { topicFromPath } from '@/data/topics'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const topicId = topicFromPath(pathname)

  return (
    <div
      data-topic={topicId ?? 'library'}
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
            {topicId ? <TopicSwitcher topicId={topicId} /> : null}
          </div>
          <SiteNav topicId={topicId} />
        </div>
      </header>
      <main className="mx-auto flex min-h-0 min-w-0 w-full max-w-6xl flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}
