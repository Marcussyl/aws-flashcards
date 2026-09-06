import { notFound } from 'next/navigation'
import { BrowseView } from '@/components/BrowseView'
import { isTopicId } from '@/data/topics'
import { listCards } from '@/lib/cards-db'

export const dynamic = 'force-dynamic'

export default async function TopicBrowsePage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!isTopicId(topic)) {
    notFound()
  }
  const cards = await listCards({ topic })
  return <BrowseView topicId={topic} cards={cards} />
}
