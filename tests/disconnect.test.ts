// tests/disconnect.test.ts
import { describe, it, expect } from 'vitest'
import { buildTrackerDB, matchTracker } from '../src/lib/disconnect'

const sampleDB = {
  'google-analytics.com': { company: 'Google', category: 'Disconnect' },
  'doubleclick.net': { company: 'Google', category: 'Advertising' },
  'facebook.com': { company: 'Facebook', category: 'Social' },
}

describe('buildTrackerDB', () => {
  it('returns a frozen readonly object', () => {
    const db = buildTrackerDB(sampleDB)
    expect(Object.isFrozen(db)).toBe(true)
  })

  it('preserves all entries', () => {
    const db = buildTrackerDB(sampleDB)
    expect(Object.keys(db)).toHaveLength(3)
  })
})

describe('matchTracker', () => {
  it('matches exact domain', () => {
    const result = matchTracker('https://www.google-analytics.com/analytics.js', sampleDB)
    expect(result).toEqual({ company: 'Google', category: 'Disconnect', domain: 'google-analytics.com' })
  })

  it('matches subdomain by stripping prefix', () => {
    const result = matchTracker('https://pixel.doubleclick.net/track?id=123', sampleDB)
    expect(result).toEqual({ company: 'Google', category: 'Advertising', domain: 'doubleclick.net' })
  })

  it('returns null for unknown domain', () => {
    const result = matchTracker('https://example.com/page', sampleDB)
    expect(result).toBeNull()
  })

  it('returns null for malformed URL', () => {
    const result = matchTracker('not-a-url', sampleDB)
    expect(result).toBeNull()
  })

  it('handles cdn subdomain stripping', () => {
    const result = matchTracker('https://connect.facebook.com/sdk.js', sampleDB)
    // facebook.com 在 DB 里，connect.facebook.com → facebook.com
    expect(result?.company).toBe('Facebook')
  })
})
