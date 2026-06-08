import React, { useState, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import type { TrackerInfo, ScoreData } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

interface GraphNode { id: string; label: string; category: string; val: number }
interface GraphLink { source: string; target: string }

const CATEGORY_COLOR: Record<string, string> = {
  Advertising: '#ef4444',
  Analytics:   '#f97316',
  Social:      '#3b82f6',
  Disconnect:  '#a855f7',
  Content:     '#22c55e',
}

export default function TrackerMap({ score, onBack }: Props) {
  const [trackers, setTrackers] = useState<TrackerInfo[]>([])
  const [selected, setSelected] = useState<TrackerInfo | null>(null)
  const [currentDomain, setCurrentDomain] = useState('当前页面')

  useEffect(() => {
    // 获取当前 tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url
      if (url) {
        try { setCurrentDomain(new URL(url).hostname) } catch { /* ignore */ }
      }
    })

    // 监听 background 推送的追踪器更新
    const listener = (msg: { type: string; trackers?: TrackerInfo[] }) => {
      if (msg.type === 'TRACKERS_UPDATE' && msg.trackers) {
        setTrackers(msg.trackers)
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    // 主动请求当前评分（background 持有追踪器数据）
    chrome.runtime.sendMessage({ type: 'GET_SCORE' })

    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // 构建力导向图数据
  const graphData = React.useMemo(() => {
    const nodes: GraphNode[] = [
      { id: currentDomain, label: currentDomain, category: 'root', val: 8 },
      ...trackers.map(t => ({
        id: t.company,
        label: t.company,
        category: t.category,
        val: 4,
      })),
    ]
    const links: GraphLink[] = trackers.map(t => ({
      source: currentDomain,
      target: t.company,
    }))
    return { nodes, links }
  }, [trackers, currentDomain])

  const nodeColor = useCallback((node: GraphNode) => {
    if (node.category === 'root') return '#ffffff'
    return CATEGORY_COLOR[node.category] ?? '#6b7280'
  }, [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    const tracker = trackers.find(t => t.company === node.id)
    setSelected(tracker ?? null)
  }, [trackers])

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">←</button>
        <h2 className="text-lg font-bold">🕸️ 追踪器</h2>
        <Badge variant="outline" className="ml-auto">{score.trackerCount} 家公司</Badge>
      </div>

      {/* Graph */}
      {trackers.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">🎉 未检测到追踪器</p>
      ) : (
        <div className="rounded-lg overflow-hidden border border-border bg-card">
          <ForceGraph2D
            graphData={graphData}
            width={300}
            height={220}
            backgroundColor="#0f1117"
            nodeLabel="label"
            nodeColor={nodeColor as (node: object) => string}
            nodeVal={(n) => (n as GraphNode).val}
            linkColor={() => '#374151'}
            cooldownTime={2000}
            warmupTicks={0}
            onNodeClick={handleNodeClick as (node: object) => void}
          />
        </div>
      )}

      {/* Selected node info */}
      {selected && (
        <Card>
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{selected.company}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: `${CATEGORY_COLOR[selected.category] ?? '#6b7280'}30`, color: CATEGORY_COLOR[selected.category] ?? '#6b7280' }}
              >
                {selected.category}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{selected.domain}</p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-auto">
        {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-xs text-muted-foreground">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
