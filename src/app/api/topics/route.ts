import { NextResponse } from 'next/server'
import type { TopicCreate } from '@/data/types'
import { createTopic, listTopics, seedTaxonomyIfEmpty } from '@/lib/taxonomy-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isCreateBody(value: unknown): value is TopicCreate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const body = value as Record<string, unknown>
  return (
    isNonEmptyString(body.id) &&
    isNonEmptyString(body.name) &&
    isNonEmptyString(body.emoji) &&
    typeof body.tagline === 'string' &&
    typeof body.blurb === 'string' &&
    isNonEmptyString(body.accent)
  )
}

export async function GET() {
  try {
    await seedTaxonomyIfEmpty()
    const topics = await listTopics()
    return NextResponse.json(topics)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load topics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown
    if (!isCreateBody(body)) {
      return NextResponse.json(
        {
          error:
            'Invalid body. Required: id, name, emoji, tagline, blurb, accent (hex). Optional: accentFg',
        },
        { status: 400 },
      )
    }
    const topic = await createTopic({
      id: body.id,
      name: body.name,
      emoji: body.emoji,
      tagline: body.tagline,
      blurb: body.blurb,
      accent: body.accent,
      accentFg: typeof body.accentFg === 'string' ? body.accentFg : undefined,
    })
    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create topic'
    const status = message.includes('already exists') || message.includes('reserved') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
