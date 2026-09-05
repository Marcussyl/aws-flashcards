import type { TopicId } from '@/data/topics'

export function topicHref(
  topic: TopicId,
  page?: 'study' | 'browse',
  query?: Record<string, string | null | undefined>,
) {
  const base = page ? `/${topic}/${page}` : `/${topic}`
  const search = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        search.set(key, value)
      }
    })
  }
  const suffix = search.toString()
  return suffix ? `${base}?${suffix}` : base
}

export function cardNoteRemainder(summary: string, answer: string) {
  const shortText = summary.trim()
  const fullText = answer.trim()
  if (!fullText || fullText === shortText) {
    return null
  }
  if (fullText.startsWith(shortText)) {
    const rest = fullText.slice(shortText.length).trim()
    return rest || null
  }
  return fullText
}
