import React from 'react'
import type { ScoreData } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

export default function XRay({ onBack }: Props) {
  return (
    <div className="p-4">
      <button onClick={onBack}>← 返回</button>
      <p>X光视图（待实现）</p>
    </div>
  )
}
