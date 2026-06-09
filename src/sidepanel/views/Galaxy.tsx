import React, { useState, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ScoreData } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

interface GraphNode { id: string; label: string; val: number; age: number; count: number }
interface GraphLink { source: string; target: string; visits: number }

type TimeRange = 'today' | 'week' | 'month'

const DAY = 86400000
const TIME_RANGE_MS: Record<TimeRange, number> = {
  today: DAY,
  week:  7 * DAY,
  month: 30 * DAY,
}
const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  today: '今天', week: '7 天', month: '30 天',
}

function domainOf(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF', fontSize: 16, padding: 0 }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 8l7 7"/></svg>
      返回
    </button>
  )
}

export default function Galaxy({ score, onBack }: Props) {
  const [range, setRange] = useState<TimeRange>('week')
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [topDomains, setTopDomains] = useState<{ domain: string; count: number }[]>([])

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    const now = Date.now()
    const startTime = now - TIME_RANGE_MS[range]

    chrome.history.search({ text: '', startTime, maxResults: 5000 }, (items) => {
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

      const sorted = [...domainMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 60)

      setTopDomains(sorted.slice(0, 10).map(([domain, v]) => ({ domain, count: v.count })))

      const nodes: GraphNode[] = sorted.map(([domain, data]) => ({
        id: domain, label: domain,
        val: Math.min(Math.sqrt(data.count) * 2, 12),
        age: now - data.lastVisit,
        count: data.count,
      }))

      const nodeIds = new Set(nodes.map(n => n.id))
      const linkMap = new Map<string, number>()
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
    })
  }, [range])

  const nodeColor = useCallback((node: object) => {
    const n = node as GraphNode
    const ageDays = n.age / DAY
    if (ageDays < 1) return '#007AFF'
    if (ageDays < 3) return '#34C759'
    if (ageDays < 7) return '#FF9500'
    return '#8E8E93'
  }, [])

  const linkWidth = useCallback((link: object) => {
    return Math.min((link as GraphLink).visits * 0.3, 3)
  }, [])

  const handleNodeClick = useCallback((node: object) => {
    setSelected(node as GraphNode)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ padding: '14px 16px 8px' }}><BackButton onBack={onBack} /></div>

      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>浏览星系</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>
              {loading ? '加载中…' : `${graphData.nodes.length} 个域名 · ${TIME_RANGE_LABEL[range]}`}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#8E8E93', lineHeight: 1.6 }}>
          <strong style={{ color: '#007AFF' }}>什么是浏览星系？</strong> 把你的历史记录变成星图——每颗星是一个网站，颜色代表最近访问时间，大小代表访问频率。数据仅在本机处理，不上传。
        </div>
      </div>

      {/* Time range selector */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px' }}>
        {(['today', 'week', 'month'] as TimeRange[]).map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            fontSize: 13, padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: range === r ? '#007AFF' : '#fff',
            color: range === r ? '#fff' : '#3C3C43',
            fontFamily: '-apple-system, sans-serif', fontWeight: range === r ? 600 : 400,
          }}>{TIME_RANGE_LABEL[r]}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#8E8E93', padding: '40px 16px', fontSize: 14 }}>加载历史记录…</div>
      ) : graphData.nodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>☁️</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>暂无浏览记录</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>多浏览一些网站再来看看</div>
        </div>
      ) : (
        <>
          {/* Force graph on dark background */}
          <div style={{ margin: '0 16px 12px', borderRadius: 14, overflow: 'hidden', background: '#1C1C1E' }}>
            <ForceGraph2D
              graphData={graphData}
              width={280} height={220}
              backgroundColor="#1C1C1E"
              nodeLabel="label"
              nodeColor={nodeColor}
              nodeVal={(n) => (n as GraphNode).val}
              linkColor={() => 'rgba(255,255,255,0.1)'}
              linkWidth={linkWidth}
              cooldownTime={3000}
              warmupTicks={20}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Legend */}
          <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>颜色 = 最近访问</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[
                { color: '#007AFF', label: '今天' },
                { color: '#34C759', label: '3 天内' },
                { color: '#FF9500', label: '7 天内' },
                { color: '#8E8E93', label: '更早' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
                  <span style={{ fontSize: 12, color: '#3C3C43' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected node info */}
          {selected && (
            <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 15, fontWeight: 600, wordBreak: 'break-all' }}>{selected.label}</div>
              <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 3 }}>
                访问 {selected.count} 次 · {selected.age < DAY ? '今天' : `${Math.round(selected.age / DAY)} 天前`}最近访问
              </div>
            </div>
          )}

          {/* Top domains */}
          <div style={{ margin: '0 16px', background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 4px', fontSize: 11, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              访问最多
            </div>
            {topDomains.map((item, i) => (
              <div key={item.domain}>
                <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 12, color: '#8E8E93', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.domain}</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#8E8E93', flexShrink: 0, marginLeft: 8 }}>{item.count} 次</span>
                </div>
                {i < topDomains.length - 1 && <div style={{ height: 0.5, background: 'rgba(60,60,67,0.12)', margin: '0 14px' }} />}
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}
