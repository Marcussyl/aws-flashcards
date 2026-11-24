import { LOCAL_PROGRESS_USER_ID } from '@/data/types'

/**
 * Copy `userId: "local"` progress onto a signed-in GitHub user when that user
 * has no docs, or fewer docs than the local partition.
 *
 * Existing per-card docs for the GitHub user are kept (`$setOnInsert`).
 * Local docs are not deleted, so logged-out study still uses `"local"`.
 */
export function shouldCopyLocalProgress(localCount: number, userCount: number): boolean {
  return localCount > 0 && userCount < localCount
}

export function isMigratableProgressUserId(userId: string): boolean {
  return userId.length > 0 && userId !== LOCAL_PROGRESS_USER_ID
}
