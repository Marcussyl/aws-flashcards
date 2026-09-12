import type { ProgressMap } from '@/data/types'

export function countByStatus(map: ProgressMap, ids: string[]) {
  let known = 0
  let learning = 0
  let unseen = 0
  ids.forEach((id) => {
    const status = map[id]?.status ?? 'unseen'
    if (status === 'known') {
      known += 1
    } else if (status === 'learning') {
      learning += 1
    } else {
      unseen += 1
    }
  })
  return { known, learning, unseen }
}
