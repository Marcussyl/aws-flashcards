import {
  isPersistedStudySession,
  type PersistedStudySession,
} from '@/lib/study-session-store'

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return null
  }
  return response.json() as Promise<unknown>
}

export async function fetchStudySessions(
  topicId?: string,
): Promise<PersistedStudySession[] | null> {
  const params = new URLSearchParams()
  if (topicId) {
    params.set('topicId', topicId)
  }
  const qs = params.toString()
  const response = await fetch(`/api/study-sessions${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  })
  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error('Failed to load study sessions')
  }
  const parsed = await parseJson(response)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return []
  }
  const sessions = (parsed as { sessions?: unknown }).sessions
  if (!Array.isArray(sessions)) {
    return []
  }
  return sessions.filter(isPersistedStudySession)
}

export async function fetchStudySession(
  sessionKey: string,
): Promise<PersistedStudySession | null> {
  const params = new URLSearchParams({ sessionKey })
  const response = await fetch(`/api/study-sessions?${params.toString()}`, {
    cache: 'no-store',
  })
  if (response.status === 401 || response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error('Failed to load study session')
  }
  const parsed = await parseJson(response)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const session = (parsed as { session?: unknown }).session
  return isPersistedStudySession(session) ? session : null
}

export async function putStudySession(
  snapshot: PersistedStudySession,
): Promise<PersistedStudySession | null> {
  const response = await fetch('/api/study-sessions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  })
  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error('Failed to save study session')
  }
  const parsed = await parseJson(response)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return snapshot
  }
  const session = (parsed as { session?: unknown }).session
  return isPersistedStudySession(session) ? session : snapshot
}

export async function deleteRemoteStudySession(sessionKey: string): Promise<void> {
  const params = new URLSearchParams({ sessionKey })
  const response = await fetch(`/api/study-sessions?${params.toString()}`, {
    method: 'DELETE',
  })
  if (response.status === 401) {
    return
  }
  if (!response.ok) {
    throw new Error('Failed to delete study session')
  }
}
