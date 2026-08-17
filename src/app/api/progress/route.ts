import { NextResponse } from 'next/server'
import { readProgressFile, writeProgressFile } from '@/lib/progress-file'
import type { ProgressMap } from '@/data/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const map = await readProgressFile()
  return NextResponse.json(map)
}

export async function PUT(request: Request) {
  const body = (await request.json()) as ProgressMap
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })
  }
  await writeProgressFile(body)
  return NextResponse.json({ ok: true })
}
