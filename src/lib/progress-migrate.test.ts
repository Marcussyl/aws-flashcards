import { describe, expect, it } from 'vitest'
import {
  isMigratableProgressUserId,
  shouldCopyLocalProgress,
} from '@/lib/progress-migrate'

describe('shouldCopyLocalProgress', () => {
  it('copies when local has docs and the user has none', () => {
    expect(shouldCopyLocalProgress(12, 0)).toBe(true)
  })

  it('copies when the signed-in user has fewer docs than local', () => {
    expect(shouldCopyLocalProgress(12, 3)).toBe(true)
  })

  it('skips when local is empty', () => {
    expect(shouldCopyLocalProgress(0, 0)).toBe(false)
    expect(shouldCopyLocalProgress(0, 4)).toBe(false)
  })

  it('skips when the user already has as many or more docs', () => {
    expect(shouldCopyLocalProgress(12, 12)).toBe(false)
    expect(shouldCopyLocalProgress(12, 20)).toBe(false)
  })
})

describe('isMigratableProgressUserId', () => {
  it('rejects empty and the local partition', () => {
    expect(isMigratableProgressUserId('')).toBe(false)
    expect(isMigratableProgressUserId('local')).toBe(false)
  })

  it('accepts a GitHub user id', () => {
    expect(isMigratableProgressUserId('78471466')).toBe(true)
  })
})
