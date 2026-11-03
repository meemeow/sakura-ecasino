import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeoutError, withTimeout } from '@/utils/withTimeout'

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves with the value when the promise settles in time', async () => {
    const result = withTimeout(
      new Promise((resolve) => setTimeout(() => resolve('saved'), 50)),
      100,
    )
    await vi.advanceTimersByTimeAsync(50)
    await expect(result).resolves.toBe('saved')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects with TimeoutError when the promise is too slow', async () => {
    const result = withTimeout(new Promise(() => {}), 100)
    const settled = expect(result).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(100)
    await settled
  })

  it('passes rejections through', async () => {
    await expect(withTimeout(Promise.reject(new Error('denied')), 100)).rejects.toThrow('denied')
  })
})
