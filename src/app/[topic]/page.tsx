import { notFound } from 'next/navigation'
import { HomeView } from '@/components/HomeView'
import { isTopicId } from '@/data/topics'

export default async function TopicDashboardPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!isTopicId(topic)) {
    notFound()
  }
  return <HomeView topicId={topic} />
}
