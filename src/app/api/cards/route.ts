import { NextResponse } from 'next/server'
import type { CardCreate } from '@/data/types'
import { createCard, forceSeedCards, listCardIds, listCards, seedCardsIfEmpty, syncSummariesFromJson } from '@/lib/cards-db'
import { categoryAllowed, topicExists } from '@/lib/taxonomy-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SeedBody = {
  force?: boolean
  summariesOnly?: boolean
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isCreateBody(value: unknown): value is CardCreate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const body = value as Record<string, unknown>
  if (!isNonEmptyString(body.topic)) {
    return false
  }
  return (
    isNonEmptyString(body.category) &&
    isNonEmptyString(body.question) &&
    isNonEmptyString(body.summary) &&
    isNonEmptyString(body.answer)
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topicParam = searchParams.get('topic')
    const category = searchParams.get('category') ?? undefined
    const q = searchParams.get('q') ?? undefined

    if (topicParam) {
      const ok = await topicExists(topicParam)
      if (!ok) {
        return NextResponse.json({ error: 'Invalid topic' }, { status: 400 })
      }
    }

    const topic = topicParam ?? undefined
    if (searchParams.get('idsOnly') === '1') {
      const ids = await listCardIds({ topic })
      return NextResponse.json(ids)
    }

    const cards = await listCards({
      topic,
      category,
      q,
    })
    return NextResponse.json(cards)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load cards'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SeedBody & Partial<CardCreate> & {
      question?: string
    }

    // Create path: body includes question (and topic/category/summary/answer)
    if (typeof body.question === 'string') {
      if (!isCreateBody(body)) {
        return NextResponse.json(
          {
            error:
              'Invalid create body. Required non-empty strings: topic, category, question, summary, answer',
          },
          { status: 400 },
        )
      }
      const topicOk = await topicExists(body.topic)
      if (!topicOk) {
        return NextResponse.json({ error: `Topic "${body.topic}" does not exist` }, { status: 400 })
      }
      if (!(await categoryAllowed(body.topic, body.category.trim()))) {
        return NextResponse.json(
          { error: `Category "${body.category}" is not valid for topic ${body.topic}` },
          { status: 400 },
        )
      }
      const card = await createCard({
        topic: body.topic,
        category: body.category.trim(),
        question: body.question.trim(),
        summary: body.summary.trim(),
        answer: body.answer.trim(),
      })
      return NextResponse.json(card, { status: 201 })
    }

    if (body.summariesOnly) {
      const synced = await syncSummariesFromJson()
      return NextResponse.json({ ok: true, summariesOnly: true, ...synced })
    }
    const seeded = body.force ? await forceSeedCards() : await seedCardsIfEmpty()
    return NextResponse.json({ ok: true, seeded })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process cards request'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
