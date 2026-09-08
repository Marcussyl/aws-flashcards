import { NextResponse } from 'next/server'
import type { CategoryCreate } from '@/data/types'
import { createCategory, listCategories, seedTaxonomyIfEmpty } from '@/lib/taxonomy-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isCreateBody(value: unknown): value is CategoryCreate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const body = value as Record<string, unknown>
  return (
    isNonEmptyString(body.topic) &&
    isNonEmptyString(body.name) &&
    isNonEmptyString(body.emoji) &&
    typeof body.blurb === 'string'
  )
}

export async function GET(request: Request) {
  try {
    await seedTaxonomyIfEmpty()
    const { searchParams } = new URL(request.url)
    const topic = searchParams.get('topic') ?? undefined
    const categories = await listCategories(topic)
    return NextResponse.json(categories)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load categories'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown
    if (!isCreateBody(body)) {
      return NextResponse.json(
        { error: 'Invalid body. Required: topic, name, emoji, blurb' },
        { status: 400 },
      )
    }
    const category = await createCategory({
      topic: body.topic,
      name: body.name,
      emoji: body.emoji,
      blurb: body.blurb,
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category'
    const status = message.includes('already exists') || message.includes('does not exist') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
