import { describe, expect, it } from 'vitest'
import type { ProgressMap } from '@/data/types'
import { countByStatus } from '@/lib/progress-stats'

describe('countByStatus', () => {
  const map: ProgressMap = {
    a: { status: 'known', seen: 3 },
    b: { status: 'learning', seen: 1 },
    c: { status: 'unseen', seen: 0 },
  }

  it('tallies known, learning, and unseen for given ids', () => {
    expect(countByStatus(map, ['a', 'b', 'c'])).toEqual({
      known: 1,
      learning: 1,
      unseen: 1,
    })
  })

  it('treats missing map entries as unseen', () => {
    expect(countByStatus(map, ['a', 'missing', 'also-missing'])).toEqual({
      known: 1,
      learning: 0,
      unseen: 2,
    })
  })

  it('returns zeros for empty id list', () => {
    expect(countByStatus(map, [])).toEqual({ known: 0, learning: 0, unseen: 0 })
  })

  it('ignores map entries not in ids', () => {
    expect(countByStatus(map, ['b'])).toEqual({
      known: 0,
      learning: 1,
      unseen: 0,
    })
  })

  it('counts duplicate ids independently', () => {
    expect(countByStatus(map, ['a', 'a'])).toEqual({
      known: 2,
      learning: 0,
      unseen: 0,
    })
  })
})
