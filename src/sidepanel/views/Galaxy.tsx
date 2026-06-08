import React, { useState, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Card, CardContent } from '../../components/ui/card'
import type { ScoreData } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

interface HistoryItem { url: string; visitCount: number; lastVisitTime: number }
interface GraphNode { id: string; label: string; val: number; age: number }
interface GraphLink { source: string; target: string; visits: number }

type TimeRange = 'today' | 'week' | 'month'

const DAY = 86400000
const TIME_RANGE_MS: Record<TimeRange, number> = {
  today: DAY,
  week:  7 * DAY,
  month: 30 * DAY,
}

function domainOf(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function ageColor(lastVisitTime: number, now: number): string {
  const age = now - lastVisitTime
  if (age < DAY) return '#ffffff'
  if (age < 7 * DAY) return '#93c5fd'
  return '#4b5563'
}

export default function Galaxy({ score, onBack }: Props) {
  const [range, setRange] = useState<TimeRange>('week')
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = Date.now()
    const startTime = now - TIME_RANGE_MS[range]

    chrome.history.search(
      { text: '', startTime, maxResults: 5000 },
      (items) => {
        const domainMap = new Map<string, { count: number; lastVisit: number }>()

        for (const item of items) {
          if (!item.url) continue
          const domain = domainOf(item.url)
          if (!domain || domain.startsWith('chrome')) continue
          const existing = domainMap.get(domain)
          const visits = item.visitCount ?? 1
          const lastVisit = item.lastVisitTime ?? now
          if (!existing) {
            domainMap.set(domain, { count: visits, lastVisit })
          } else {
            domainMap.set(domain, {
              count: existing.count + visits,
              lastVisit: Math.max(existing.lastVisit, lastVisit),
            })
          }
        }

        // 取访问最多的前 60 个域名
        const sorted = [...domainMap.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 60)

        const nodes: GraphNode[] = sorted.map(([domain, data]) => ({
          id: domain,
          label: domain,
          val: Math.min(Math.sqrt(data.count) * 2, 12),
          age: data.lastVisit,
        }))

        // 简单建立跳转关系：按时间排序的 URL 序列，相邻不同域名之间连线
        const linkMap = new Map<string, number>()
        const nodeIds = new Set(nodes.map(n => n.id))
        const sortedItems = [...items]
          .filter(i => i.url && nodeIds.has(domainOf(i.url!)))
          .sort((a, b) => (a.lastVisitTime ?? 0) - (b.lastVisitTime ?? 0))

        for (let i = 0; i < sortedItems.length - 1; i++) {
          const src = domainOf(sortedItems[i].url!)
          const dst = domainOf(sortedItems[i + 1].url!)
          if (src === dst || !nodeIds.has(src) || !nodeIds.has(dst)) continue
          const key = `${src}→${dst}`
          linkMap.set(key, (linkMap.get(key) ?? 0) + 1)
        }

        const links: GraphLink[] = [...linkMap.entries()]
          .filter(([, v]) => v >= 2)
          .map(([key, visits]) => {
            const [source, target] = key.split('→')
            return { source, target, visits }
          })

        setGraphData({ nodes, links })
        setLoading(false)
      }
    )
  }, [range])

  const nodeColor = useCallback((node: GraphNode) => ageColor(node.age, Date.now()), [])
  const linkWidth = useCallback((link: GraphLink) => Math.min(link.visits * 0.3, 3), [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelected(node)
  }, [])

  const ranges: { key: TimeRange; label: string }[] = [
    { key: 'today', label: '今天' },
    { key: 'week',  label: '本周' },
    { key: 'month', label: '本月' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">←</button>
        <h2 className="text-lg font-bold">🌌 历史星系</h2>
        <span className="text-xs text-muted-foreground ml-auto">第 {score.visitCount} 次</span>
      </div>

      {/* Time range selector */}
      <div className="flex gap-1">
        {ranges.map(r => (
          <button
            key={r.key}
            onClick={() => { setLoading(true); setRange(r.key) }}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              range === r.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Graph */}
      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-8">加载历史…</p>
      ) : graphData.nodes.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">暂无历史记录</p>
      ) : (
        <div className="rounded-lg overflow-hidden border border-border bg-[#050810]">
          <ForceGraph2D
            graphData={graphData}
            width={300}
            height={260}
            backgroundColor="#050810"
            nodeLabel="label"
            nodeColor={nodeColor as (node: object) => string}
            nodeVal={(n) => (n as GraphNode).val}
            linkColor={() => '#1f2937'}
            linkWidth={linkWidth as (link: object) => number}
            cooldownTime={3000}
            warmupTicks={0}
            onNodeClick={handleNodeClick as (node: object) => void}
          />
        </div>
      )}

      {/* Selected domain info */}
      {selected && (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm font-medium">{selected.label}</p>
            <p className="text-xs text-muted-foreground">
              最近访问：{new Date(selected.age).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex gap-3 mt-auto">
        {[['#ffffff', '今天'], ['#93c5fd', '本周'], ['#4b5563', '更早']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="text-xs text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
