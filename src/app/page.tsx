import { TopicLibrary } from '@/components/TopicLibrary'
import { TOPIC_IDS, type TopicId } from '@/data/topics'
import { listCardMeta, type CardMeta } from '@/lib/cards-db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const all = await listCardMeta()
  const cardsByTopic = TOPIC_IDS.reduce(
    (acc, topic) => {
      acc[topic] = all.filter((card) => card.topic === topic)
      return acc
    },
    {} as Record<TopicId, CardMeta[]>,
  )
  return <TopicLibrary cardsByTopic={cardsByTopic} />
}
