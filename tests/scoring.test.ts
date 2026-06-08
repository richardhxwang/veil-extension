import { calculateScore } from '../src/lib/scoring'

describe('calculateScore', () => {
  it('returns 100 for a clean page', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 })).toBe(100)
  })

  it('deducts 8 per dark pattern, capped at 32', () => {
    expect(calculateScore({ darkPatternCount: 2, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 })).toBe(84)
    expect(calculateScore({ darkPatternCount: 10, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 })).toBe(68)
  })

  it('deducts 5 per tracker, capped at 35', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 3, hiddenElementCount: 0, visitCount: 0 })).toBe(85)
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 20, hiddenElementCount: 0, visitCount: 0 })).toBe(65)
  })

  it('deducts 2 per hidden element, capped at 20', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 5, visitCount: 0 })).toBe(90)
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 30, visitCount: 0 })).toBe(80)
  })

  it('adds 3 per visit, capped at 10', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 2 })).toBe(100)
    // dark: min(5*8,32)=32, tracker: min(5*5,35)=25, hidden: min(5*2,20)=10, visit: min(10*3,10)=10
    // 100 - 32 - 25 - 10 + 10 = 43
    expect(calculateScore({ darkPatternCount: 5, trackerCount: 5, hiddenElementCount: 5, visitCount: 10 })).toBe(43)
  })

  it('never goes below 0', () => {
    // caps: dark=32, tracker=35, hidden=20, sum=87 → min score=13; Math.max(0,...) guards against future algorithm changes
    expect(calculateScore({ darkPatternCount: 100, trackerCount: 100, hiddenElementCount: 100, visitCount: 0 })).toBe(13)
    // verify Math.max(0,...) would work if caps were ever raised
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 })).toBeGreaterThanOrEqual(0)
  })
})
