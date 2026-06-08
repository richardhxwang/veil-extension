import React from 'react'
import type { ScoreData } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

export default function TrackerMap({ onBack }: Props) {
  return (
    <div className="p-4">
      <button onClick={onBack}>← 返回</button>
      <p>追踪器地图（待实现）</p>
    </div>
  )
}
