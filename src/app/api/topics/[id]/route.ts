import { NextResponse } from 'next/server'
import type { TopicUpdate } from '@/data/types'
import { deleteTopic, getTopic, updateTopic } from '@/lib/taxonomy-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

function isUpdateBody(value: unknown): value is TopicUpdate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const body = value as TopicUpdate
  const keys = Object.keys(body)
  if (keys.length === 0) {
    return false
  }
  return keys.every((key) => {
    if (
      key !== 'name' &&
      key !== 'emoji' &&
      key !== 'tagline' &&
      key !== 'blurb' &&
      key !== 'accent' &&
      key !== 'accentFg'
    ) {
      return false
    }
    return typeof body[key as keyof TopicUpdate] === 'string'
  })
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const topic = await getTopic(id)
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }
    return NextResponse.json(topic)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load topic'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as unknown
    if (!isUpdateBody(body)) {
      return NextResponse.json(
        { error: 'Invalid patch. Allowed string fields: name, emoji, tagline, blurb, accent, accentFg' },
        { status: 400 },
      )
    }
    const topic = await updateTopic(id, body)
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }
    return NextResponse.json(topic)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update topic'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const result = await deleteTopic(id)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete topic'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
