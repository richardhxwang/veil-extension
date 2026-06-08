// src/entrypoints/content/overlay.ts
// X 光蒙版工具 — 注入红色半透明 overlay 标记隐藏元素

import type { HiddenElement } from '../../lib/types'

let overlayContainer: HTMLElement | null = null

export function injectXRayOverlay(hiddenEls: HiddenElement[]): void {
  removeXRayOverlay()
  overlayContainer = document.createElement('div')
  overlayContainer.id = '__veil_xray__'
  overlayContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483646;'
  document.body.appendChild(overlayContainer)

  for (const h of hiddenEls) {
    try {
      const el = document.querySelector(h.selector)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const marker = document.createElement('div')
      marker.style.cssText = [
        'position:fixed',
        `top:${rect.top}px`,
        `left:${rect.left}px`,
        `width:${Math.max(rect.width, 20)}px`,
        `height:${Math.max(rect.height, 20)}px`,
        'background:rgba(239,68,68,0.3)',
        'border:2px solid #ef4444',
        'border-radius:2px',
        'box-sizing:border-box',
        'pointer-events:none',
      ].join(';')
      // Tooltip
      const tip = document.createElement('div')
      tip.style.cssText = 'position:absolute;top:0;left:0;background:#1e1e2e;color:#fff;font-size:11px;padding:2px 6px;border-radius:2px;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;'
      tip.textContent = `${h.tagName} · ${h.reason}`
      marker.appendChild(tip)
      overlayContainer.appendChild(marker)
    } catch {
      // selector errors
    }
  }
}

export function removeXRayOverlay(): void {
  overlayContainer?.remove()
  overlayContainer = null
  document.getElementById('__veil_xray__')?.remove()
}
