import { notFound } from 'next/navigation'
import { HomeView } from '@/components/HomeView'
import { listCardMeta } from '@/lib/cards-db'
import { topicExists } from '@/lib/taxonomy-db'

export const dynamic = 'force-dynamic'

export default async function TopicDashboardPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!(await topicExists(topic))) {
    notFound()
  }
  const cards = await listCardMeta({ topic })
  return <HomeView topicId={topic} cards={cards} />
}
