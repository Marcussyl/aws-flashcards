import {
  fetchStudySession,
  fetchStudySessions,
  putStudySession,
} from '@/lib/study-session-api'
import {
  listStudySessions,
  loadAllStudySessions,
  loadStudySession,
  mergeStudySessionSnapshots,
  pickNewerStudySession,
  writeStudySessionSnapshot,
  type PersistedStudySession,
  type StudySessionStorage,
  type StudySessionSummary,
} from '@/lib/study-session-store'

/**
 * Pull remote sessions (when signed in), merge with localStorage using
 * last-write-wins, and push any local-newer/local-only snapshots.
 */
export async function syncStudySessions(
  storage: StudySessionStorage,
  options: { topicId?: string; signedIn: boolean; now?: number } = { signedIn: false },
): Promise<StudySessionSummary[]> {
  if (!options.signedIn) {
    return listStudySessions(storage, { topicId: options.topicId, now: options.now })
  }

  const local = loadAllStudySessions(storage, {
    topicId: options.topicId,
    now: options.now,
  })
  let remote: PersistedStudySession[] = []
  try {
    remote = (await fetchStudySessions(options.topicId)) ?? []
  } catch (error) {
    console.error('Failed to fetch remote study sessions', error)
  }

  const { toLocal, toRemote } = mergeStudySessionSnapshots(
    local,
    remote,
    options.now,
  )
  for (const snapshot of toLocal) {
    writeStudySessionSnapshot(storage, snapshot)
  }
  await Promise.all(
    toRemote.map((snapshot) =>
      putStudySession(snapshot).catch((error) => {
        console.error('Failed to push study session', error)
      }),
    ),
  )

  return listStudySessions(storage, { topicId: options.topicId, now: options.now })
}

/**
 * Resolve a single session key: localStorage vs Mongo, last-write-wins.
 * Writes the winner back to the losing store.
 */
export async function resolveStudySession(
  storage: StudySessionStorage | null,
  sessionKey: string,
  options: { signedIn: boolean; now?: number },
): Promise<PersistedStudySession | null> {
  const now = options.now ?? Date.now()
  const local = storage ? loadStudySession(storage, sessionKey, now) : null

  if (!options.signedIn) {
    return local
  }

  let remote: PersistedStudySession | null = null
  try {
    remote = await fetchStudySession(sessionKey)
  } catch (error) {
    console.error('Failed to fetch remote study session', error)
  }

  if (local && remote) {
    const winner = pickNewerStudySession(local, remote)
    if (winner === remote && storage) {
      writeStudySessionSnapshot(storage, remote)
    } else if (winner === local) {
      void putStudySession(local).catch((error) => {
        console.error('Failed to push study session', error)
      })
    }
    return winner
  }
  if (remote) {
    if (storage) {
      writeStudySessionSnapshot(storage, remote)
    }
    return remote
  }
  if (local) {
    void putStudySession(local).catch((error) => {
      console.error('Failed to push study session', error)
    })
    return local
  }
  return null
}
