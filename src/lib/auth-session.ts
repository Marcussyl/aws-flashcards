import { auth } from '@/auth'
import { LOCAL_PROGRESS_USER_ID } from '@/data/types'

/** Signed-in GitHub user id, or null when logged out. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth()
  const id = session?.user?.id
  if (typeof id === 'string' && id.length > 0) {
    return id
  }
  return null
}

/**
 * Progress partition: GitHub user id when signed in, otherwise `"local"`.
 * Logged-out clients keep the pre-auth Mongo partition.
 */
export async function getProgressUserId(): Promise<string> {
  return (await getSessionUserId()) ?? LOCAL_PROGRESS_USER_ID
}
