// src/entrypoints/content/dark-patterns.ts
import { runAllDetectors } from '../../lib/dark-pattern-rules'
import type { DarkPattern } from '../../lib/types'

const highlightedEls: HTMLElement[] = []

export function scanDarkPatterns(): DarkPattern[] {
  return runAllDetectors(document)
}

export function setHighlight(enabled: boolean, patterns: DarkPattern[]): void {
  // 清除旧高亮
  for (const el of highlightedEls) {
    el.style.outline = ''
    el.style.outlineOffset = ''
  }
  highlightedEls.length = 0

  if (!enabled) return

  for (const p of patterns) {
    // pattern.element 可能是 tagName 或 outerHTML 片段，尝试匹配
    try {
      const tag = p.element.replace(/<[^>]+>/g, '').trim() || p.element
      const selector = tag.includes('<') ? '*' : tag
      const els = document.querySelectorAll<HTMLElement>(selector)
      for (const el of els) {
        el.style.outline = '3px solid #ef4444'
        el.style.outlineOffset = '2px'
        highlightedEls.push(el)
      }
    } catch {
      // ignore invalid selectors
    }
  }
}
