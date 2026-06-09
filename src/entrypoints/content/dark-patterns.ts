import { runAllDetectors } from '../../lib/dark-pattern-rules'
import type { DarkPattern } from '../../lib/types'

const highlightedEls: HTMLElement[] = []

// 解析倒计时文字为秒数，如 "23:45:12" → 85512，"14:30" → 870
function parseSeconds(text: string): number | null {
  const m = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/)
  if (!m) return null
  const a = parseInt(m[1]), b = parseInt(m[2])
  const c = m[3] !== undefined ? parseInt(m[3]) : null
  return c !== null ? a * 3600 + b * 60 + c : a * 60 + b
}

// 用 localStorage 跨刷新验证倒计时是否真实递减
function verifyCountdowns(patterns: DarkPattern[]): DarkPattern[] {
  const domain = window.location.hostname
  const now = Date.now()
  const result: DarkPattern[] = []

  for (const p of patterns) {
    if (p.type !== '可疑倒计时') {
      result.push(p)
      continue
    }

    let currentSecs: number | null = null
    try {
      const el = document.querySelector<HTMLElement>(p.element)
      currentSecs = parseSeconds(el?.textContent?.trim() || '')
    } catch { /* bad selector */ }

    const key = `veil_cd_${domain}_${p.element.slice(0, 60)}`

    try {
      const raw = localStorage.getItem(key)

      // 存储当前值，无论如何
      if (currentSecs !== null) {
        localStorage.setItem(key, JSON.stringify({ secs: currentSecs, ts: now }))
      }

      if (!raw || currentSecs === null) {
        // 第一次访问：保留为"可疑"，等下次确认
        result.push(p)
        continue
      }

      const { secs: prevSecs, ts: prevTs } = JSON.parse(raw) as { secs: number; ts: number }
      const elapsedSecs = (now - prevTs) / 1000

      if (elapsedSecs < 120) {
        // 间隔太短，无法判断
        result.push(p)
        continue
      }

      const actualDecrease = prevSecs - currentSecs
      const expectedDecrease = elapsedSecs

      if (actualDecrease < expectedDecrease * 0.3) {
        // 递减量不足预期的 30%：确认为假
        result.push({
          ...p,
          type: '虚假倒计时（已确认）',
          description: `距上次访问 ${Math.round(elapsedSecs / 60)} 分钟，计时器几乎未变化（应减少 ${Math.round(expectedDecrease / 60)} 分钟，实际仅减少 ${Math.round(actualDecrease)} 秒），确认为刷新重置的假倒计时`,
        })
      }
      // 递减正常 → 真实倒计时，不报告
    } catch {
      result.push(p)  // localStorage 不可用，保守保留
    }
  }

  return result
}

export function scanDarkPatterns(): DarkPattern[] {
  const raw = runAllDetectors(document)
  return verifyCountdowns(raw)
}

export function setHighlight(enabled: boolean, patterns: DarkPattern[]): void {
  for (const el of highlightedEls) {
    el.style.outline = ''
    el.style.outlineOffset = ''
  }
  highlightedEls.length = 0

  if (!enabled) return

  for (const p of patterns) {
    try {
      const els = document.querySelectorAll<HTMLElement>(p.element)
      for (const el of els) {
        el.style.outline = '3px solid #FF9500'
        el.style.outlineOffset = '2px'
        highlightedEls.push(el)
      }
    } catch { /* ignore */ }
  }
}
