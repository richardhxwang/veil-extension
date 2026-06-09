import React, { useState, useEffect } from 'react'
import type { HiddenElement, ScoreData, VeilMessage } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

const REASON_META: Record<string, { label: string; color: string; bg: string; icon: string; explain: string }> = {
  'hidden-input': {
    label: '隐藏表单字段',
    color: '#FF3B30', bg: '#FFE8E8',
    icon: '⌨',
    explain: '提交订单时会一起发送，可能预设了价格、套餐或追踪 ID，用户无法看到或修改',
  },
  'tracking-pixel': {
    label: '追踪像素',
    color: '#FF9500', bg: '#FFF3E0',
    icon: '👁',
    explain: '1×1 像素图片或隐藏图片，向第三方服务器汇报你的行为，通常来自广告/分析公司',
  },
  'hidden-terms': {
    label: '隐藏条款',
    color: '#AF52DE', bg: '#F3E8FF',
    icon: '📄',
    explain: '包含"自动续费"或"订阅协议"等关键词的隐藏文本，可能是你同意某个按钮时背后的条款',
  },
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF', fontSize: 16, padding: 0 }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 8l7 7"/></svg>
      返回
    </button>
  )
}

export default function XRay({ onBack }: Props) {
  const [elements, setElements] = useState<HiddenElement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('全部')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId == null) { setLoading(false); return }
      chrome.tabs.sendMessage(
        tabId,
        { type: 'SCAN_HIDDEN_ELEMENTS' } as VeilMessage,
        (res: { elements: HiddenElement[] } | undefined) => {
          if (chrome.runtime.lastError || !res) { setLoading(false); return }
          setElements(res.elements ?? [])
          setLoading(false)
        }
      )
    })
  }, [])

  const locate = (selector: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'LOCATE_ELEMENT', selector } as VeilMessage)
    })
  }

  const reasons = ['全部', ...Array.from(new Set(elements.map(e => e.reason)))]
  const filtered = filter === '全部' ? elements : elements.filter(e => e.reason === filter)
  const grouped = filtered.reduce<Record<string, HiddenElement[]>>((acc, el) => {
    ;(acc[el.reason] = acc[el.reason] ?? []).push(el)
    return acc
  }, {})

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
            <div style={{ fontSize: 20, fontWeight: 700 }}>隐藏内容</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>
              {loading ? '扫描中…' : elements.length === 0 ? '未发现可疑隐藏内容' : `发现 ${elements.length} 个可疑项`}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#8E8E93', lineHeight: 1.6 }}>
          <strong style={{ color: '#AF52DE' }}>扫描什么？</strong> 隐藏表单字段（可能预设了价格/套餐）、追踪像素（向广告商汇报行为）、含"自动续费"等关键词的隐藏条款文本。
        </div>
      </div>

      {/* 分类筛选 */}
      {elements.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', flexWrap: 'wrap' }}>
          {reasons.map(r => {
            const meta = REASON_META[r]
            const label = meta?.label ?? r
            return (
              <button key={r} onClick={() => setFilter(r)} style={{
                fontSize: 12, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: filter === r ? '#007AFF' : '#fff',
                color: filter === r ? '#fff' : '#3C3C43',
                fontFamily: '-apple-system, sans-serif',
              }}>{filter === r || r === '全部' ? label : label}</button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#8E8E93', padding: '40px 16px', fontSize: 14 }}>扫描中…</div>
      ) : elements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>未发现可疑隐藏内容</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>没有检测到预设表单字段、追踪像素或隐藏条款</div>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([reason, items]) => {
            const meta = REASON_META[reason] ?? { label: reason, color: '#8E8E93', bg: '#F2F2F7', icon: '?', explain: '' }
            return (
              <div key={reason}>
                {/* 分类标题 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{meta.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: '#8E8E93' }}>· {items.length} 个</span>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(60,60,67,0.12)', fontSize: 11, color: '#8E8E93', lineHeight: 1.5 }}>
                    {meta.explain}
                  </div>
                  {items.map((el, i) => (
                    <div key={i}>
                      <button
                        onClick={() => locate(el.selector)}
                        style={{ width: '100%', background: 'none', border: 'none', padding: '12px 14px', textAlign: 'left', cursor: 'pointer' }}
                      >
                        {/* 隐藏表单：显示字段名 + 值 */}
                        {reason === 'hidden-input' && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <code style={{ fontSize: 12, background: '#F2F2F7', padding: '2px 6px', borderRadius: 4, color: '#3C3C43' }}>
                                {el.fieldName}
                              </code>
                              <span style={{ fontSize: 11, color: '#8E8E93' }}>隐藏字段</span>
                            </div>
                            <div style={{ fontSize: 13, color: meta.color, fontWeight: 500, wordBreak: 'break-all' }}>
                              值："{el.fieldValue}"
                            </div>
                          </>
                        )}
                        {/* 追踪像素：显示 URL */}
                        {reason === 'tracking-pixel' && (
                          <div style={{ fontSize: 12, color: '#3C3C43', wordBreak: 'break-all', lineHeight: 1.5 }}>
                            {el.contentPreview}
                          </div>
                        )}
                        {/* 隐藏条款：显示文本内容 */}
                        {reason === 'hidden-terms' && (
                          <div style={{ fontSize: 13, color: '#3C3C43', lineHeight: 1.6 }}>
                            {el.contentPreview}
                            {el.contentPreview.length >= 120 && <span style={{ color: '#8E8E93' }}>…</span>}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: '#C7C7CC', marginTop: 4 }}>点击在页面定位 →</div>
                      </button>
                      {i < items.length - 1 && <div style={{ height: 0.5, background: 'rgba(60,60,67,0.12)', margin: '0 14px' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}
