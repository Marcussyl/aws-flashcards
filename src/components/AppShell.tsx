'use client'

import { useEffect, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AmbientBackdrop } from '@/components/AmbientBackdrop'
import { AuthButton } from '@/components/AuthButton'
import { MemoriMark } from '@/components/MemoriMark'
import { SiteNav } from '@/components/SiteNav'
import { TopicSwitcher } from '@/components/TopicSwitcher'
import { topicFromPath } from '@/data/topics'
import { ProgressProvider } from '@/lib/progress'
import { getStudySessionStorage } from '@/lib/study-session-store'
import { syncStudySessions } from '@/lib/study-session-sync'
import { TaxonomyProvider, useTaxonomy } from '@/lib/taxonomy'
import { APP_VERSION } from '@/lib/version'

/** Push local sessions and pull remote ones once the user is signed in. */
function StudySessionAuthSync() {
  const { status } = useSession()
  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }
    const storage = getStudySessionStorage()
    if (!storage) {
      return
    }
    void syncStudySessions(storage, { signedIn: true }).catch((error) => {
      console.error('Failed to sync study sessions after sign-in', error)
    })
  }, [status])
  return null
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const topicId = topicFromPath(pathname)
  const { accentFor, getTopic } = useTaxonomy()
  const accents = accentFor(topicId)
  const topic = topicId ? getTopic(topicId) : undefined

  return (
    <ProgressProvider>
      <StudySessionAuthSync />
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
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <SiteNav topicId={topicId} />
              <AuthButton />
            </div>
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
