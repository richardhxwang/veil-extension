import React from 'react'
import { Progress } from '../../components/ui/progress'
import { Card, CardContent } from '../../components/ui/card'
import type { ScoreData, ViewName } from '../../lib/types'
import { scoreToColor } from '../../lib/scoring'

interface Props {
  score: ScoreData
  onNavigate: (view: ViewName) => void
}

export default function Home({ score, onNavigate }: Props) {
  const color = scoreToColor(score.total)

  const modules = [
    {
      icon: '🎭',
      label: '暗模式',
      value: score.darkPatternCount,
      unit: '个陷阱',
      view: 'darkpatterns' as ViewName,
      // 暗模式越多分越低，progress = 满减
      progress: Math.max(0, 100 - score.darkPatternCount * 25),
    },
    {
      icon: '🕸️',
      label: '追踪器',
      value: score.trackerCount,
      unit: '家公司',
      view: 'trackers' as ViewName,
      progress: Math.max(0, 100 - score.trackerCount * 14),
    },
    {
      icon: '👁️',
      label: '隐藏层',
      value: score.hiddenElementCount,
      unit: '个元素',
      view: 'xray' as ViewName,
      progress: Math.max(0, 100 - score.hiddenElementCount * 10),
    },
    {
      icon: '🌌',
      label: '我的轨迹',
      value: score.visitCount,
      unit: `第 ${score.visitCount} 次`,
      view: 'galaxy' as ViewName,
      progress: Math.min(100, score.visitCount * 10),
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wider text-foreground/90">VEIL</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">透明度</span>
          <span className="text-2xl font-bold" style={{ color }}>{score.total}</span>
        </div>
      </div>

      {/* Score bar */}
      <Progress value={score.total} className="h-2" />

      {/* Modules */}
      <div className="flex flex-col gap-2">
        {modules.map((m) => (
          <Card
            key={m.view}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onNavigate(m.view)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-xl">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.value} {m.unit}</span>
                </div>
                <Progress value={m.progress} className="h-1.5" />
              </div>
              <span className="text-muted-foreground text-xs">›</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-auto">
        全本地 · 零数据上传
      </p>
    </div>
  )
}
