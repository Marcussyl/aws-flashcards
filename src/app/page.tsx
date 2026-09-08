import { TopicLibrary } from '@/components/TopicLibrary'
import { listCardMeta } from '@/lib/cards-db'
import { listTopics } from '@/lib/taxonomy-db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [all, topics] = await Promise.all([listCardMeta(), listTopics()])
  const cardsByTopic: Record<string, typeof all> = {}
  for (const topic of topics) {
    cardsByTopic[topic.id] = all.filter((card) => card.topic === topic.id)
  }
  // Include any card topics not yet in taxonomy (should be rare)
  for (const card of all) {
    if (!cardsByTopic[card.topic]) {
      cardsByTopic[card.topic] = all.filter((item) => item.topic === card.topic)
    }
  }
  return <TopicLibrary cardsByTopic={cardsByTopic} />
}
