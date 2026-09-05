import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { IconShuffle } from '@/components/icons'
import { StudyView } from '@/components/StudyView'
import { isTopicId } from '@/data/topics'

export default async function TopicStudyPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!isTopicId(topic)) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 flex-col items-center justify-center text-center">
          <IconShuffle className="h-6 w-6 text-accent" />
          <p className="mt-3 text-slate-400">Loading deck…</p>
        </div>
      }
    >
      <StudyView topicId={topic} />
    </Suspense>
  )
}
