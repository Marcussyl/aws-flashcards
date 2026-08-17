import { NextResponse } from 'next/server'
import { readProgress, writeProgress } from '@/lib/progress-db'
import type { ProgressEntry, ProgressMap } from '@/data/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isProgressMap(value: unknown): value is ProgressMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false
    }
    const item = entry as ProgressEntry
    const validStatus =
      item.status === 'learning' || item.status === 'known' || item.status === 'unseen'
    return validStatus && typeof item.seen === 'number'
  })
}

export async function GET() {
  try {
    const map = await readProgress()
    return NextResponse.json(map)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load progress'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const body = (await request.json()) as unknown
  if (!isProgressMap(body)) {
    return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })
  }
  try {
    await writeProgress(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save progress'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
