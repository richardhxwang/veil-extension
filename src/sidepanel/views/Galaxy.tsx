import React from 'react'
import type { ScoreData } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

export default function Galaxy({ onBack }: Props) {
  return (
    <div className="p-4">
      <button onClick={onBack}>← 返回</button>
      <p>星系图（待实现）</p>
    </div>
  )
}
