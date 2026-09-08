import { NextResponse } from 'next/server'
import type { CategoryUpdate } from '@/data/types'
import { deleteCategory, getCategory, updateCategory } from '@/lib/taxonomy-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

function isUpdateBody(value: unknown): value is CategoryUpdate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const body = value as CategoryUpdate
  const keys = Object.keys(body)
  if (keys.length === 0) {
    return false
  }
  return keys.every((key) => {
    if (key !== 'name' && key !== 'emoji' && key !== 'blurb') {
      return false
    }
    return typeof body[key as keyof CategoryUpdate] === 'string'
  })
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const category = await getCategory(decodeURIComponent(id))
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json(category)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load category'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as unknown
    if (!isUpdateBody(body)) {
      return NextResponse.json(
        { error: 'Invalid patch. Allowed string fields: name, emoji, blurb' },
        { status: 400 },
      )
    }
    const category = await updateCategory(decodeURIComponent(id), body)
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json(category)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update category'
    const status = message.includes('already exists') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const result = await deleteCategory(decodeURIComponent(id))
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
