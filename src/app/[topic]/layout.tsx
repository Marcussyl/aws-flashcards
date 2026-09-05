import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTopic, isTopicId, TOPIC_IDS } from '@/data/topics'

export function generateStaticParams() {
  return TOPIC_IDS.map((topic) => ({ topic }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>
}): Promise<Metadata> {
  const { topic } = await params
  const meta = getTopic(topic)
  return {
    title: meta?.name ?? 'Topic',
  }
}

export default async function TopicLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ topic: string }>
}) {
  const { topic } = await params
  if (!isTopicId(topic)) {
    notFound()
  }
  return children
}
