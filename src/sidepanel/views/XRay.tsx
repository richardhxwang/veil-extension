import React, { useState, useEffect } from 'react'
import type { HiddenElement, ScoreData, VeilMessage } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

const REASON_META: Record<string, { color: string; bg: string; explain: string }> = {
  'display:none':      { color: '#FF3B30', bg: '#FFE8E8', explain: '完全不渲染，不占空间，用户无法察觉' },
  'visibility:hidden': { color: '#FF9500', bg: '#FFF3E0', explain: '占空间但不显示，可能包含隐藏内容' },
  'opacity:0':         { color: '#AF52DE', bg: '#F3E8FF', explain: '透明度为零，内容依然存在于页面中' },
  '移出视口':           { color: '#007AFF', bg: '#E8F0FF', explain: '用负坐标或绝对定位移到屏幕外' },
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF', fontSize: 16, padding: 0 }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 8l7 7"/></svg>
      返回
    </button>
  )
}

export default function XRay({ score, onBack }: Props) {
  const [elements, setElements] = useState<HiddenElement[]>([])
  const [loading, setLoading] = useState(true)
  const [xrayOn, setXrayOn] = useState(false)
  const [filter, setFilter] = useState('全部')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId == null) { setLoading(false); return }
      chrome.tabs.sendMessage(tabId, { type: 'SCAN_HIDDEN_ELEMENTS' } as VeilMessage,
        (res: { elements: HiddenElement[] } | undefined) => {
          if (chrome.runtime.lastError || !res) { setLoading(false); return }
          setElements(res.elements ?? [])
          setLoading(false)
        })
    })
    return () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_XRAY', enabled: false } as VeilMessage)
      })
    }
  }, [])

  const toggleXray = (v: boolean) => {
    setXrayOn(v)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_XRAY', enabled: v } as VeilMessage)
    })
  }

  const locate = (selector: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'LOCATE_ELEMENT', selector } as VeilMessage)
    })
  }

  const reasons = ['全部', ...Array.from(new Set(elements.map(e => e.reason)))]
  const filtered = filter === '全部' ? elements : elements.filter(e => e.reason === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ padding: '14px 16px 8px' }}><BackButton onBack={onBack} /></div>

      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#AF52DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>X 光隐藏层</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>
              {loading ? '扫描中…' : `发现 ${elements.length} 个不可见元素`}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#8E8E93', lineHeight: 1.6 }}>
          <strong style={{ color: '#AF52DE' }}>什么是隐藏层？</strong> 网页中存在但用户看不见的元素，可能用于追踪、预加载内容、或隐藏订阅条款。开启蒙版后可在页面上看到它们的位置。
        </div>
      </div>

      {/* X-ray toggle */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>开启 X 光蒙版</div>
          <div style={{ fontSize: 12, color: '#8E8E93' }}>用紫色边框在页面标出隐藏元素位置</div>
        </div>
        <button onClick={() => toggleXray(!xrayOn)} style={{
          width: 51, height: 31, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: xrayOn ? '#34C759' : '#E5E5EA', position: 'relative', transition: 'background 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: xrayOn ? 22 : 2,
            width: 27, height: 27, borderRadius: 14, background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Filter pills */}
      {elements.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', flexWrap: 'wrap' }}>
          {reasons.map(r => (
            <button key={r} onClick={() => setFilter(r)} style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: filter === r ? '#007AFF' : '#fff',
              color: filter === r ? '#fff' : '#3C3C43',
              fontFamily: '-apple-system, sans-serif',
            }}>{r}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#8E8E93', padding: '40px 16px', fontSize: 14 }}>扫描中…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>未发现隐藏元素</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>页面透明度较高</div>
        </div>
      ) : (
        <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((el, i) => {
            const meta = REASON_META[el.reason] ?? { color: '#8E8E93', bg: '#F2F2F7', explain: '' }
            return (
              <button key={i} onClick={() => locate(el.selector)} style={{
                background: '#fff', border: 'none', borderRadius: 12, padding: '12px 14px',
                textAlign: 'left', cursor: 'pointer', width: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <code style={{ fontSize: 11, color: '#8E8E93', background: '#F2F2F7', padding: '1px 6px', borderRadius: 4 }}>
                    &lt;{el.tagName}&gt;
                  </code>
                  <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: 20 }}>
                    {el.reason}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#000', lineHeight: 1.5 }}>{el.contentPreview || '（无文字内容）'}</div>
                <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 3 }}>{meta.explain}</div>
                <div style={{ fontSize: 10, color: '#C7C7CC', marginTop: 3 }}>点击在页面定位 →</div>
              </button>
            )
          })}
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}
