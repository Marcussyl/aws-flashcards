import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { StudySessionsSkeleton } from '@/components/StudySessionsSkeleton'
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
    <Suspense fallback={<StudySessionsSkeleton />}>
      <StudyView topicId={topic} cards={cards} />
    </Suspense>
  )
}
