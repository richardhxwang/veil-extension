import type { HiddenElement } from '../../lib/types'

// 跳过安全 token，不属于暗模式
const SAFE_INPUT_NAMES = /csrf|token|authenticity|nonce|_method|utf8|captcha|recaptcha|__/i

// 可疑隐藏 input 名字：与定价/订阅/追踪相关
const SUSPICIOUS_INPUT_NAMES = /price|amount|plan|tier|level|product_id|sku|offer|promo|discount|subscription|period|billing|charge|renew|套餐|价格|期限|referral|affiliate|campaign/i

// 隐藏文本中出现的自动续费/条款关键词
const TERMS_KEYWORDS = /auto.?renew|autorenew|自动续费|automatically (charged|billed)|将自动扣|recurring (charge|payment)|subscription terms|订阅.*条款|授权.*自动|by clicking .{0,30} you agree|同意.*自动|cancel anytime/i

function buildSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  const tag = el.tagName.toLowerCase()
  const cls = Array.from(el.classList).slice(0, 2).map(c => `.${CSS.escape(c)}`).join('')
  return cls ? `${tag}${cls}` : tag
}

export function scanHiddenElements(): HiddenElement[] {
  const results: HiddenElement[] = []
  const seen = new Set<string>()

  // ── 1. 隐藏 input 含可疑字段 ────────────────────────────────────────────
  const inputs = document.querySelectorAll<HTMLInputElement>('input[type="hidden"]')
  for (const inp of inputs) {
    const name = inp.name || inp.id || ''
    const value = inp.value || ''
    if (!value) continue
    if (SAFE_INPUT_NAMES.test(name)) continue
    if (!SUSPICIOUS_INPUT_NAMES.test(name)) continue

    const sel = buildSelector(inp)
    if (seen.has(sel)) continue
    seen.add(sel)

    results.push({
      tagName: 'input',
      reason: 'hidden-input',
      selector: sel,
      contentPreview: `字段名: ${name}`,
      fieldName: name,
      fieldValue: value.slice(0, 80),
      riskLevel: 'high',
    })
  }

  // ── 2. 追踪像素 (1×1 img 或 display:none img) ───────────────────────────
  const imgs = document.querySelectorAll<HTMLImageElement>('img')
  for (const img of imgs) {
    const cs = window.getComputedStyle(img)
    const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '99')
    const h = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '99')
    const isPixel = (w <= 2 && h <= 2) || cs.display === 'none'
    if (!isPixel) continue

    const src = img.src || img.getAttribute('src') || ''
    if (!src || src.startsWith('data:')) continue  // inline images are usually UI

    const sel = buildSelector(img)
    if (seen.has(sel)) continue
    seen.add(sel)

    results.push({
      tagName: 'img',
      reason: 'tracking-pixel',
      selector: sel,
      contentPreview: src.replace(/^https?:\/\//, '').slice(0, 80),
      riskLevel: 'medium',
    })
  }

  // ── 3. 隐藏的法律/自动续费条款文本 ─────────────────────────────────────
  const candidates = document.querySelectorAll<HTMLElement>(
    'div, p, span, section, aside, small'
  )
  for (const el of candidates) {
    const cs = window.getComputedStyle(el)
    if (cs.display !== 'none' && cs.visibility !== 'hidden') continue

    const text = (el.textContent || '').trim()
    if (text.length < 30) continue
    if (!TERMS_KEYWORDS.test(text)) continue

    // 跳过已被父级覆盖的子元素
    const sel = buildSelector(el)
    if (seen.has(sel)) continue
    seen.add(sel)

    // 避免子元素重复报告父元素已报告的内容
    let ancestor = el.parentElement
    let covered = false
    while (ancestor && ancestor !== document.body) {
      if (seen.has(buildSelector(ancestor))) { covered = true; break }
      ancestor = ancestor.parentElement
    }
    if (covered) continue

    results.push({
      tagName: el.tagName.toLowerCase(),
      reason: 'hidden-terms',
      selector: sel,
      contentPreview: text.slice(0, 120),
      riskLevel: 'high',
    })
  }

  return results.slice(0, 30)
}
