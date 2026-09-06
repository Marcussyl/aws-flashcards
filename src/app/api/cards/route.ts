import { NextResponse } from 'next/server'
import { isTopicId } from '@/data/topics'
import { forceSeedCards, listCards, seedCardsIfEmpty, syncSummariesFromJson } from '@/lib/cards-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topicParam = searchParams.get('topic')
    const category = searchParams.get('category') ?? undefined
    const q = searchParams.get('q') ?? undefined

    if (topicParam && !isTopicId(topicParam)) {
      return NextResponse.json({ error: 'Invalid topic' }, { status: 400 })
    }

    const cards = await listCards({
      topic: topicParam && isTopicId(topicParam) ? topicParam : undefined,
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
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean
      summariesOnly?: boolean
    }
    if (body.summariesOnly) {
      const synced = await syncSummariesFromJson()
      return NextResponse.json({ ok: true, summariesOnly: true, ...synced })
    }
    const seeded = body.force ? await forceSeedCards() : await seedCardsIfEmpty()
    return NextResponse.json({ ok: true, seeded })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed cards'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
