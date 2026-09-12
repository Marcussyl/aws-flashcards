import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { StudyView } from '@/components/StudyView'
import { listCards } from '@/lib/cards-db'
import { topicExists } from '@/lib/taxonomy-db'

export const dynamic = 'force-dynamic'

export default async function TopicStudyPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!(await topicExists(topic))) {
    notFound()
  }
  const cards = await listCards({ topic })

  return (
    <Suspense
      fallback={
        <div
          className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col justify-center gap-4 px-1"
          aria-busy="true"
          aria-label="Loading study"
        >
          <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
          <div className="min-h-[18rem] rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/5" />
          </div>
        </div>
      }
    >
      <StudyView topicId={topic} cards={cards} />
    </Suspense>
  )
}
