import { notFound } from 'next/navigation'
import { BrowseView } from '@/components/BrowseView'
import { isTopicId } from '@/data/topics'

export default async function TopicBrowsePage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!isTopicId(topic)) {
    notFound()
  }
  return <BrowseView topicId={topic} />
}
