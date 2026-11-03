import { describe, expect, it } from 'vitest'
import { gameTabs } from '@/constants/gameTabs'

describe('gameTabs', () => {
  it('have unique values and routes', () => {
    expect(new Set(gameTabs.map((tab) => tab.value)).size).toBe(gameTabs.length)
    expect(new Set(gameTabs.map((tab) => tab.to)).size).toBe(gameTabs.length)
  })

  it('give every category tab a page title', () => {
    for (const tab of gameTabs) if ('category' in tab) expect(tab.title).toBeTruthy()
  })
})
