export const TOPIC_IDS = ['aws', 'pve'] as const

export type TopicId = (typeof TOPIC_IDS)[number]

export type TopicMeta = {
  id: TopicId
  name: string
  blurb: string
  emoji: string
  tagline: string
}

export const TOPICS: TopicMeta[] = [
  {
    id: 'aws',
    name: 'AWS Solutions Architect',
    blurb: 'Exam-style cloud architecture facts from your notes.',
    emoji: '☁️',
    tagline: 'Cloud architecture',
  },
  {
    id: 'pve',
    name: 'Proxmox VE',
    blurb: 'Homelab virtualization: LXC, QEMU, storage, and networking.',
    emoji: '🖥️',
    tagline: 'Virtualization',
  },
]

export function isTopicId(value: string): value is TopicId {
  return TOPIC_IDS.includes(value as TopicId)
}

export function getTopic(id: string): TopicMeta | undefined {
  return TOPICS.find((item) => item.id === id)
}

export function topicFromPath(pathname: string): TopicId | null {
  const first = pathname.split('/').filter(Boolean)[0]
  return first && isTopicId(first) ? first : null
}
