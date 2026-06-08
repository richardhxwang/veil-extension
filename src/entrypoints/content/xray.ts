// src/entrypoints/content/xray.ts
import type { HiddenElement } from '../../lib/types'

export function scanHiddenElements(): HiddenElement[] {
  const results: HiddenElement[] = []
  const all = document.querySelectorAll<HTMLElement>('*')

  for (const el of all) {
    const tag = el.tagName.toLowerCase()
    // 跳过无意义标签
    if (['script', 'style', 'meta', 'link', 'head', 'html', 'body', 'noscript'].includes(tag)) continue

    const cs = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()

    let reason = ''
    if (cs.display === 'none') reason = 'display:none'
    else if (cs.visibility === 'hidden') reason = 'visibility:hidden'
    else if (parseFloat(cs.opacity) === 0) reason = 'opacity:0'
    else if (rect.width > 0 && rect.height > 0 &&
             (rect.right < 0 || rect.bottom < 0 ||
              rect.left > window.innerWidth || rect.top > window.innerHeight)) {
      reason = '移出视口'
    }

    if (!reason) continue

    // 只报告有内容的元素
    const text = el.textContent?.trim() || ''
    if (!text && !el.querySelector('img,input,button')) continue

    // 生成稳定 selector
    const selector = buildSelector(el)
    results.push({
      selector,
      reason,
      contentPreview: text.slice(0, 60) || `<${tag}>`,
      tagName: tag,
    })
  }
  return results.slice(0, 50) // 最多返回 50 个
}

function buildSelector(el: HTMLElement): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  const tag = el.tagName.toLowerCase()
  const cls = Array.from(el.classList).slice(0, 2).map(c => `.${CSS.escape(c)}`).join('')
  return cls ? `${tag}${cls}` : tag
}
