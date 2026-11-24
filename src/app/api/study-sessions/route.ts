import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth-session'
import {
  deleteStudySessionForUser,
  getStudySessionForUser,
  listStudySessionsForUser,
  saveStudySessionForUser,
} from '@/lib/study-session-db'
import { isPersistedStudySession } from '@/lib/study-session-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; error: NextResponse }
> {
  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true, userId }
}

export async function GET(request: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) {
    return authResult.error
  }
  const { userId } = authResult

  const { searchParams } = new URL(request.url)
  const sessionKey = searchParams.get('sessionKey')
  const topicId = searchParams.get('topicId') ?? undefined

  try {
    if (sessionKey) {
      const session = await getStudySessionForUser(userId, sessionKey)
      return NextResponse.json({ session })
    }
    const sessions = await listStudySessionsForUser(userId, { topicId })
    return NextResponse.json({ sessions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load study sessions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) {
    return authResult.error
  }
  const { userId } = authResult

  const body = (await request.json()) as unknown
  if (!isPersistedStudySession(body)) {
    return NextResponse.json({ error: 'Invalid study session payload' }, { status: 400 })
  }

  try {
    const session = await saveStudySessionForUser(userId, body)
    return NextResponse.json({ ok: true, session })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save study session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) {
    return authResult.error
  }
  const { userId } = authResult

  const { searchParams } = new URL(request.url)
  const sessionKey = searchParams.get('sessionKey')
  if (!sessionKey) {
    return NextResponse.json({ error: 'Missing sessionKey' }, { status: 400 })
  }

  try {
    await deleteStudySessionForUser(userId, sessionKey)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete study session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
