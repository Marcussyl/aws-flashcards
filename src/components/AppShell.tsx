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
      className='relative flex h-dvh flex-col overflow-hidden bg-background text-foreground'
    >
      <AmbientBackdrop />
      <header className='relative z-50 h-14 shrink-0 border-b border-border bg-[#0f131c]/85 backdrop-blur-xl'>
        <div className='mx-auto flex h-full max-w-[1180px] items-center justify-between gap-3 px-4 lg:px-10'>
          <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
            <Link href='/' className='flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight'>
              <MemoriMark className='size-8 text-accent' title='Memori' />
              <span className='text-foreground'>Memori</span>
            </Link>
            {topicId ? <TopicSwitcher topicId={topicId} /> : null}
          </div>
          <SiteNav topicId={topicId} />
        </div>
      </header>
      <main className='mx-auto flex min-h-0 w-full max-w-[1180px] flex-1 flex-col overflow-y-auto px-4 py-6 lg:px-10 lg:py-8'>
        {children}
      </main>
    </div>
  )
}
