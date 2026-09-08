import { NextResponse } from 'next/server'
import {
  readProgressMap,
  upsertProgressEntry,
  writeProgressMap,
} from '@/lib/progress-db'
import type { ProgressEntry, ProgressMap } from '@/data/types'
import { LOCAL_PROGRESS_USER_ID } from '@/data/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isProgressEntry(value: unknown): value is ProgressEntry {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as ProgressEntry
  const validStatus =
    item.status === 'learning' || item.status === 'known' || item.status === 'unseen'
  return validStatus && typeof item.seen === 'number'
}

function isProgressMap(value: unknown): value is ProgressMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every(isProgressEntry)
}

export async function GET() {
  try {
    const map = await readProgressMap(LOCAL_PROGRESS_USER_ID)
    return NextResponse.json(map)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load progress'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Full-map sync (reset / compatibility). Replaces the user's per-card docs. */
export async function PUT(request: Request) {
  const body = (await request.json()) as unknown
  if (!isProgressMap(body)) {
    return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })
  }
  try {
    await writeProgressMap(body, LOCAL_PROGRESS_USER_ID)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save progress'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Single-card upsert used by ProgressProvider.mark(). */
export async function PATCH(request: Request) {
  const body = (await request.json()) as unknown
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })
  }
  const { cardId, entry } = body as { cardId?: unknown; entry?: unknown }
  if (typeof cardId !== 'string' || !cardId || !isProgressEntry(entry)) {
    return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })
  }
  try {
    await upsertProgressEntry(cardId, entry, LOCAL_PROGRESS_USER_ID)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save progress'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
