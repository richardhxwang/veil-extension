import React, { useState, useEffect } from 'react'
import type { DarkPattern, ScoreData, VeilMessage } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

const TYPE_META: Record<string, { color: string; bg: string; explain: string }> = {
  '预勾选订阅': { color: '#FF9500', bg: '#FFF3E0', explain: '已替你勾选付费/订阅选项，容易被忽视' },
  '羞辱式按钮': { color: '#AF52DE', bg: '#F3E8FF', explain: '把「不买」说成「我就是喜欢浪费钱」' },
  '可疑倒计时': { color: '#FF3B30', bg: '#FFE8E8', explain: '促销语境下的倒计时，可能是制造焦虑的假限时。刷新页面后若数字重置则基本确认是假的。' },
  '隐藏取消选项': { color: '#FF9500', bg: '#FFF3E0', explain: '退订/取消链接被故意设成细字或白色' },
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#007AFF', fontSize: 16, padding: '0 0 0 2px',
    }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1L1 8l7 7"/>
      </svg>
      返回
    </button>
  )
}

export default function DarkPatterns({ score, onBack }: Props) {
  const [patterns, setPatterns] = useState<DarkPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [highlight, setHighlight] = useState(false)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId == null) { setLoading(false); return }
      chrome.tabs.sendMessage(tabId, { type: 'SCAN_DARK_PATTERNS' } as VeilMessage,
        (res: { patterns: DarkPattern[] } | undefined) => {
          if (chrome.runtime.lastError || !res) { setLoading(false); return }
          setPatterns(res.patterns ?? [])
          setLoading(false)
        })
    })
    return () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_HIGHLIGHT', enabled: false } as VeilMessage)
      })
    }
  }, [])

  const toggleHighlight = (v: boolean) => {
    setHighlight(v)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_HIGHLIGHT', enabled: v } as VeilMessage)
    })
  }

  const locate = (selector: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'LOCATE_ELEMENT', selector } as VeilMessage)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, sans-serif' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 8px' }}>
        <BackButton onBack={onBack} />
      </div>

      {/* Title section */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FF9500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="15" r=".5" fill="#fff"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>暗模式检测</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>
              {loading ? '扫描中…' : `共发现 ${patterns.length} 个操纵设计`}
            </div>
          </div>
        </div>

        {/* What is this */}
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#8E8E93', lineHeight: 1.6 }}>
          <strong style={{ color: '#FF9500' }}>什么是暗模式？</strong> 网站用来操纵你做出非本意决定的设计手段，例如偷偷订阅、羞辱性按钮文字、假倒计时等。
        </div>
      </div>

      {/* Highlight toggle */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>在页面高亮显示</div>
          <div style={{ fontSize: 12, color: '#8E8E93' }}>用红色边框标出问题元素</div>
        </div>
        <button
          onClick={() => toggleHighlight(!highlight)}
          style={{
            width: 51, height: 31, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: highlight ? '#34C759' : '#E5E5EA',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute', top: 2, left: highlight ? 22 : 2,
            width: 27, height: 27, borderRadius: 14, background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#8E8E93', padding: '40px 16px', fontSize: 14 }}>扫描中…</div>
      ) : patterns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>未检测到暗模式</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>这个网站看起来比较正直</div>
        </div>
      ) : (
        <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {patterns.map((p, i) => {
            const meta = TYPE_META[p.type] ?? { color: '#8E8E93', bg: '#F2F2F7', explain: '' }
            return (
              <button key={i} onClick={() => locate(p.element)} style={{
                background: '#fff', border: 'none', borderRadius: 12, padding: '12px 14px',
                textAlign: 'left', cursor: 'pointer', width: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: 20 }}>
                    {p.type}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#3C3C43', lineHeight: 1.5 }}>{p.description}</div>
                {meta.explain && <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>{meta.explain}</div>}
                <div style={{ fontSize: 10, color: '#C7C7CC', marginTop: 4 }}>点击在页面定位 →</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
