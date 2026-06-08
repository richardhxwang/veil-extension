import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Switch } from '../../components/ui/switch'
import type { HiddenElement, ScoreData, VeilMessage } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

const REASON_COLOR: Record<string, string> = {
  'display:none':        'bg-red-500/20 text-red-300',
  'visibility:hidden':   'bg-orange-500/20 text-orange-300',
  'opacity:0':           'bg-yellow-500/20 text-yellow-300',
  '移出视口':             'bg-blue-500/20 text-blue-300',
}

export default function XRay({ score, onBack }: Props) {
  const [elements, setElements] = useState<HiddenElement[]>([])
  const [loading, setLoading] = useState(true)
  const [xrayOn, setXrayOn] = useState(false)
  const [filter, setFilter] = useState<string>('全部')

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
    return () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId != null) {
          chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_XRAY', enabled: false } as VeilMessage)
        }
      })
    }
  }, [])

  const toggleXray = (enabled: boolean) => {
    setXrayOn(enabled)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) {
        chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_XRAY', enabled } as VeilMessage)
      }
    })
  }

  const locateElement = (selector: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) {
        chrome.tabs.sendMessage(tabId, { type: 'LOCATE_ELEMENT', selector } as VeilMessage)
      }
    })
  }

  const reasons = ['全部', ...Array.from(new Set(elements.map(e => e.reason)))]
  const filtered = filter === '全部' ? elements : elements.filter(e => e.reason === filter)

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">←</button>
        <h2 className="text-lg font-bold">👁️ X 光模式</h2>
        <Badge variant="outline" className="ml-auto">{score.hiddenElementCount} 个</Badge>
      </div>

      {/* X-ray toggle */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <span className="text-sm">开启 X 光蒙版</span>
          <Switch checked={xrayOn} onCheckedChange={toggleXray} />
        </CardContent>
      </Card>

      {/* Filter tabs */}
      {elements.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {reasons.map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                filter === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-8">扫描中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">🎉 未发现隐藏元素</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((el, i) => (
            <Card
              key={i}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => locateElement(el.selector)}
            >
              <CardContent className="p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground">&lt;{el.tagName}&gt;</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${REASON_COLOR[el.reason] ?? 'bg-muted text-muted-foreground'}`}>
                    {el.reason}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 truncate">{el.contentPreview}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{el.selector}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
