import { NextResponse } from 'next/server'
import { mergeCategories } from '@/lib/taxonomy-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { targetId?: unknown }
    if (typeof body.targetId !== 'string' || !body.targetId.trim()) {
      return NextResponse.json({ error: 'targetId is required' }, { status: 400 })
    }
    const result = await mergeCategories(decodeURIComponent(id), body.targetId.trim())
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to merge categories'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
