import type { ScoreInput } from './types'

export function calculateScore(input: ScoreInput): number {
  const darkPenalty = Math.min(input.darkPatternCount * 8, 32)
  const trackerPenalty = Math.min(input.trackerCount * 5, 35)
  const hiddenPenalty = Math.min(input.hiddenElementCount * 2, 20)
  const historyBonus = Math.min(input.visitCount * 3, 10)
  const score = 100 - darkPenalty - trackerPenalty - hiddenPenalty + historyBonus
  return Math.max(0, Math.min(100, score))
}

export function scoreToColor(score: number): string {
  if (score >= 70) return '#22c55e'  // green-500
  if (score >= 40) return '#eab308'  // yellow-500
  return '#ef4444'                    // red-500
}
