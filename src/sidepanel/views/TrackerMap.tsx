import React, { useState, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { TrackerInfo, ScoreData } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }
interface GraphNode { id: string; label: string; category: string; val: number }
interface GraphLink { source: string; target: string }

const CAT_COLOR: Record<string, string> = {
  Advertising: '#FF3B30',
  Analytics: '#FF9500',
  Social: '#007AFF',
  Disconnect: '#AF52DE',
  Content: '#34C759',
}
const CAT_ZH: Record<string, string> = {
  Advertising: '广告', Analytics: '分析', Social: '社交', Disconnect: '追踪', Content: '内容',
}
const CAT_EXPLAIN: Record<string, string> = {
  Advertising: '根据你的行为投放精准广告',
  Analytics: '统计你的浏览数据卖给商家',
  Social: '社交平台跨站追踪你的活动',
  Disconnect: '综合追踪器',
  Content: '内容分发网络，风险较低',
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF', fontSize: 16, padding: 0 }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 8l7 7"/></svg>
      返回
    </button>
  )
}

export default function TrackerMap({ score, onBack }: Props) {
  const [trackers, setTrackers] = useState<TrackerInfo[]>([])
  const [selected, setSelected] = useState<TrackerInfo | null>(null)
  const [domain, setDomain] = useState('当前页面')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url
      if (url) try { setDomain(new URL(url).hostname) } catch { /* */ }
    })
    chrome.runtime.sendMessage({ type: 'GET_TRACKERS' }, (res: { trackers: TrackerInfo[] } | undefined) => {
      if (!chrome.runtime.lastError && res) setTrackers(res.trackers ?? [])
    })
    const fn = (msg: { type: string; trackers?: TrackerInfo[] }) => {
      if (msg.type === 'TRACKERS_UPDATE' && msg.trackers) setTrackers(msg.trackers)
    }
    chrome.runtime.onMessage.addListener(fn)
    return () => chrome.runtime.onMessage.removeListener(fn)
  }, [])

  const graphData = React.useMemo(() => ({
    nodes: [
      { id: domain, label: domain, category: 'root', val: 10 },
      ...trackers.map(t => ({ id: t.company, label: t.company, category: t.category, val: 5 })),
    ] as GraphNode[],
    links: trackers.map(t => ({ source: domain, target: t.company })) as GraphLink[],
  }), [trackers, domain])

  const nodeColor = useCallback((node: GraphNode) =>
    node.category === 'root' ? '#007AFF' : (CAT_COLOR[node.category] ?? '#8E8E93'), [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelected(trackers.find(t => t.company === node.id) ?? null)
  }, [trackers])

  const byCategory = trackers.reduce<Record<string, TrackerInfo[]>>((acc, t) => {
    ;(acc[t.category] = acc[t.category] ?? []).push(t)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ padding: '14px 16px 8px' }}><BackButton onBack={onBack} /></div>

      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="#fff"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>追踪器</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>{domain} · {trackers.length} 家公司正在监测你</div>
          </div>
        </div>
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#8E8E93', lineHeight: 1.6 }}>
          <strong style={{ color: '#FF3B30' }}>什么是追踪器？</strong> 嵌入网页的第三方脚本，在你不知情的情况下记录你点了什么、停留多久，并把数据卖给广告商。
        </div>
      </div>

      {trackers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>未检测到追踪器</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>这个页面相对干净</div>
        </div>
      ) : (
        <>
          {/* Force graph */}
          <div style={{ margin: '0 16px 12px', borderRadius: 14, overflow: 'hidden', background: '#1C1C1E' }}>
            <ForceGraph2D
              graphData={graphData}
              width={280} height={200}
              backgroundColor="#1C1C1E"
              nodeLabel="label"
              nodeColor={nodeColor as (node: object) => string}
              nodeVal={(n) => (n as GraphNode).val}
              linkColor={() => 'rgba(255,255,255,0.15)'}
              cooldownTime={2000}
              warmupTicks={0}
              onNodeClick={handleNodeClick as (node: object) => void}
            />
          </div>

          {/* Selected */}
          {selected && (
            <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{selected.company}</span>
                <span style={{ fontSize: 11, color: CAT_COLOR[selected.category] ?? '#8E8E93', background: `${CAT_COLOR[selected.category]}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                  {CAT_ZH[selected.category] ?? selected.category}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>{selected.domain}</div>
              <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>{CAT_EXPLAIN[selected.category]}</div>
            </div>
          )}

          {/* Category breakdown */}
          <div style={{ margin: '0 16px', background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
            {Object.entries(byCategory).map(([cat, items], i, arr) => (
              <div key={cat}>
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: CAT_COLOR[cat] ?? '#8E8E93' }} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{CAT_ZH[cat] ?? cat}</span>
                    </div>
                    <span style={{ fontSize: 13, color: '#8E8E93' }}>{items.length} 个</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2, paddingLeft: 16 }}>{CAT_EXPLAIN[cat]}</div>
                  <div style={{ fontSize: 12, color: '#3C3C43', marginTop: 4, paddingLeft: 16 }}>
                    {items.map(t => t.company).join('、')}
                  </div>
                </div>
                {i < arr.length - 1 && <div style={{ height: 0.5, background: 'rgba(60,60,67,0.12)', margin: '0 14px' }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
