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

// CSS.escape polyfill for jsdom test environments
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s)
  return s.replace(/([^\w-])/g, '\\$1')
}

// 构建稳定的 CSS 选择器（用于 locateElement）
function buildSelector(el: Element): string {
  if (el.id) return `#${cssEscape(el.id)}`
  const tag = el.tagName.toLowerCase()
  const cls = Array.from(el.classList).slice(0, 2).map(c => `.${cssEscape(c)}`).join('')
  return cls ? `${tag}${cls}` : tag
}

export function detectPreCheckedBoxes(doc: Document): DarkPattern[] {
  const results: DarkPattern[] = []
  const checkboxes = doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"][checked]')

  for (const cb of checkboxes) {
    let labelText = ''
    const id = cb.id
    if (id) {
      const label = doc.querySelector(`label[for="${id}"]`)
      if (label) labelText = label.textContent || ''
    }
    const parentText = cb.parentElement?.textContent || ''
    const combinedText = labelText + parentText

    if (MONEY_KEYWORDS.test(combinedText)) {
      results.push({
        type: '预勾选订阅',
        element: buildSelector(cb),
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
        element: buildSelector(el),
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
      element: buildSelector(el),
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
      /opacity\s*:\s*0\.[0-2]/i.test(style) ||
      /font-size\s*:\s*[0-9]px(?!\d)/i.test(style) ||  // tiny font (1–9px, no false-positive on 19px)
      /color\s*:\s*#[fF]{6}/i.test(style) ||
      /color\s*:\s*white/i.test(style) ||
      /display\s*:\s*none/i.test(style) ||
      /visibility\s*:\s*hidden/i.test(style)

    if (isHidden) {
      results.push({
        type: '隐藏取消选项',
        element: buildSelector(el),
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
