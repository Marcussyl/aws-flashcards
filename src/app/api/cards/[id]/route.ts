import { NextResponse } from 'next/server'
import type { CardUpdate } from '@/data/types'
import { getCard, updateCard } from '@/lib/cards-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

function isCardUpdate(value: unknown): value is CardUpdate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const body = value as CardUpdate
  const keys = Object.keys(body)
  if (keys.length === 0) {
    return false
  }
  return keys.every((key) => {
    if (key !== 'question' && key !== 'summary' && key !== 'answer' && key !== 'category') {
      return false
    }
    return typeof body[key as keyof CardUpdate] === 'string'
  })
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const card = await getCard(id)
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json(card)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load card'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as unknown
    if (!isCardUpdate(body)) {
      return NextResponse.json(
        { error: 'Invalid patch. Allowed string fields: question, summary, answer, category' },
        { status: 400 },
      )
    }
    const card = await updateCard(id, body)
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json(card)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update card'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
