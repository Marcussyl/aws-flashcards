import { TopicLibrary } from '@/components/TopicLibrary'
import { TOPIC_IDS, type TopicId } from '@/data/topics'
import type { Card } from '@/data/types'
import { listCards } from '@/lib/cards-db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const all = await listCards()
  const cardsByTopic = TOPIC_IDS.reduce(
    (acc, topic) => {
      acc[topic] = all.filter((card) => card.topic === topic)
      return acc
    },
    {} as Record<TopicId, Card[]>,
  )
  return <TopicLibrary cardsByTopic={cardsByTopic} />
}
