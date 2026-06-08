import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Switch } from '../../components/ui/switch'
import type { DarkPattern, ScoreData, VeilMessage } from '../../lib/types'

interface Props { score: ScoreData; onBack: () => void }

const TYPE_COLOR: Record<string, string> = {
  '预勾选订阅': 'bg-orange-500/20 text-orange-300',
  '羞辱式按钮': 'bg-purple-500/20 text-purple-300',
  '虚假倒计时': 'bg-red-500/20 text-red-300',
  '隐藏取消选项': 'bg-yellow-500/20 text-yellow-300',
}

export default function DarkPatterns({ score, onBack }: Props) {
  const [patterns, setPatterns] = useState<DarkPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [highlight, setHighlight] = useState(false)

  useEffect(() => {
    // 向 active tab 的 content script 发送扫描请求
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId == null) { setLoading(false); return }
      chrome.tabs.sendMessage(
        tabId,
        { type: 'SCAN_DARK_PATTERNS' } as VeilMessage,
        (res: { patterns: DarkPattern[] } | undefined) => {
          if (chrome.runtime.lastError || !res) { setLoading(false); return }
          setPatterns(res.patterns ?? [])
          setLoading(false)
        }
      )
    })
    return () => {
      // 离开时关闭高亮
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId != null) {
          chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_HIGHLIGHT', enabled: false } as VeilMessage)
        }
      })
    }
  }, [])

  const toggleHighlight = (enabled: boolean) => {
    setHighlight(enabled)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId != null) {
        chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_HIGHLIGHT', enabled } as VeilMessage)
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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">←</button>
        <h2 className="text-lg font-bold">🎭 暗模式检测</h2>
        <Badge variant="outline" className="ml-auto">{score.darkPatternCount} 个</Badge>
      </div>

      {/* Highlight toggle */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <span className="text-sm">开启高亮模式</span>
          <Switch checked={highlight} onCheckedChange={toggleHighlight} />
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-8">扫描中…</p>
      ) : patterns.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">🎉 未检测到暗模式</p>
      ) : (
        <div className="flex flex-col gap-2">
          {patterns.map((p, i) => (
            <Card
              key={i}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => locateElement(p.element)}  // p.element is a CSS selector
            >
              <CardContent className="p-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[p.type] ?? 'bg-muted text-muted-foreground'}`}>
                    {p.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
