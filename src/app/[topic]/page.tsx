import { notFound } from 'next/navigation'
import { HomeView } from '@/components/HomeView'
import { isTopicId } from '@/data/topics'
import { listCards } from '@/lib/cards-db'

export const dynamic = 'force-dynamic'

export default async function TopicDashboardPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!isTopicId(topic)) {
    notFound()
  }
  const cards = await listCards({ topic })
  return <HomeView topicId={topic} cards={cards} />
}
