// src/lib/dark-pattern-rules.ts
import type { DarkPattern } from './types'

// 金钱/价格相关词（用于预勾选检测）
const MONEY_KEYWORDS = /\$|€|£|¥|元|订阅|subscribe|renewal|charge|payment|fee|price|促销|优惠/i

// 羞辱式按钮关键词（英文）
const SHAME_PHRASES_EN = [
  /no\s*thanks?,\s*i\s*(hate|don'?t|love paying|prefer not)/i,
  /no\s*thanks?,\s*i\s*(don'?t want|don'?t need)/i,
  /i\s*don'?t\s*(want|need)\s*(to\s*)?(save|discount|deal|offer)/i,
  /i\s*(love|prefer)\s*(paying|spending)\s*more/i,
]

// 羞辱式按钮关键词（中文）
const SHAME_PHRASES_ZH = [
  /不了[，,]?\s*我不需要省/,
  /不了[，,]?\s*我不想/,
  /不了[，,]?\s*我不要优惠/,
  /放弃(优惠|折扣|省钱)/,
]

// 取消/退订相关词
const CANCEL_KEYWORDS = /cancel|unsubscribe|退订|取消订阅|不续费/i

export function detectPreCheckedBoxes(doc: Document): DarkPattern[] {
  const results: DarkPattern[] = []
  const checkboxes = doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"][checked]')

  for (const cb of checkboxes) {
    // 查找关联 label
    let labelText = ''
    const id = cb.id
    if (id) {
      const label = doc.querySelector(`label[for="${id}"]`)
      if (label) labelText = label.textContent || ''
    }
    // 也检查父元素附近的文字
    const parentText = cb.parentElement?.textContent || ''
    const combinedText = labelText + parentText

    if (MONEY_KEYWORDS.test(combinedText)) {
      results.push({
        type: '预勾选订阅',
        element: cb.outerHTML.slice(0, 100),
        description: `预先勾选的订阅/付费选项：${combinedText.trim().slice(0, 60)}`,
      })
    }
  }
  return results
}

export function detectShamePatterns(doc: Document): DarkPattern[] {
  const results: DarkPattern[] = []
  const els = doc.querySelectorAll<HTMLElement>('button, a, [role="button"]')

  for (const el of els) {
    const text = el.textContent?.trim() || ''
    if (!text) continue

    const isShame =
      SHAME_PHRASES_EN.some(p => p.test(text)) ||
      SHAME_PHRASES_ZH.some(p => p.test(text))

    if (isShame) {
      results.push({
        type: '羞辱式按钮',
        element: el.tagName.toLowerCase(),
        description: `羞辱式拒绝选项：${text.slice(0, 80)}`,
      })
    }
  }
  return results
}

export function detectCountdowns(doc: Document): DarkPattern[] {
  const results: DarkPattern[] = []
  const els = doc.querySelectorAll<HTMLElement>(
    '[class*="countdown"],[class*="timer"],[class*="clock"],[id*="countdown"],[id*="timer"]'
  )

  for (const el of els) {
    results.push({
      type: '虚假倒计时',
      element: el.tagName.toLowerCase(),
      description: `倒计时元素可能制造虚假紧迫感：${(el.textContent || '').trim().slice(0, 60)}`,
    })
  }
  return results
}

export function detectHiddenCancel(doc: Document): DarkPattern[] {
  const results: DarkPattern[] = []
  const els = doc.querySelectorAll<HTMLElement>('a, button')

  for (const el of els) {
    const text = el.textContent?.trim() || ''
    if (!CANCEL_KEYWORDS.test(text)) continue

    const style = el.getAttribute('style') || ''
    const isHidden =
      /opacity\s*:\s*0\.[0-2]/i.test(style) ||      // opacity < 0.3
      /font-size\s*:\s*[0-9]px/i.test(style) ||      // tiny font (single digit px)
      /color\s*:\s*#[fF]{6}/i.test(style) ||          // white text (#ffffff)
      /color\s*:\s*white/i.test(style) ||
      /display\s*:\s*none/i.test(style) ||
      /visibility\s*:\s*hidden/i.test(style)

    if (isHidden) {
      results.push({
        type: '隐藏取消选项',
        element: el.tagName.toLowerCase(),
        description: `取消/退订链接被刻意隐藏：${text.slice(0, 60)}`,
      })
    }
  }
  return results
}

export function runAllDetectors(doc: Document): DarkPattern[] {
  return [
    ...detectPreCheckedBoxes(doc),
    ...detectShamePatterns(doc),
    ...detectCountdowns(doc),
    ...detectHiddenCancel(doc),
  ]
}
