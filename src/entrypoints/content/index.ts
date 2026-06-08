// src/entrypoints/content/index.ts
import { scanDarkPatterns, setHighlight } from './dark-patterns'
import { scanHiddenElements } from './xray'
import { injectFloatingBall, updateBallScore } from './floating-ball'
import { injectXRayOverlay, removeXRayOverlay } from './overlay'
import type { VeilMessage, DarkPattern, HiddenElement } from '../../lib/types'

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // 不在 chrome:// 等页面运行
    if (!document.body) return

    // 注入悬浮球
    injectFloatingBall()

    // 缓存扫描结果
    let cachedDarkPatterns: DarkPattern[] = []
    let cachedHiddenElements: HiddenElement[] = []

    // 页面加载完成后扫描
    const doScan = () => {
      cachedDarkPatterns = scanDarkPatterns()
      cachedHiddenElements = scanHiddenElements()
      chrome.runtime.sendMessage({
        type: 'DARK_PATTERNS_RESULT',
        patterns: cachedDarkPatterns,
      } as VeilMessage)
      chrome.runtime.sendMessage({
        type: 'HIDDEN_ELEMENTS_RESULT',
        elements: cachedHiddenElements,
      } as VeilMessage)
    }

    if (document.readyState === 'complete') {
      doScan()
    } else {
      window.addEventListener('load', doScan, { once: true })
    }

    // 监听 background/sidepanel 消息
    // 只对需要 sendResponse 的两种消息返回 true（async channel），其余返回 undefined
    chrome.runtime.onMessage.addListener((msg: VeilMessage, _sender, sendResponse) => {
      switch (msg.type) {
        case 'SCORE_UPDATE':
          updateBallScore(msg.data.total)
          return

        case 'SCAN_DARK_PATTERNS':
          cachedDarkPatterns = scanDarkPatterns()
          sendResponse({ patterns: cachedDarkPatterns })
          return true

        case 'SCAN_HIDDEN_ELEMENTS':
          cachedHiddenElements = scanHiddenElements()
          sendResponse({ elements: cachedHiddenElements })
          return true

        case 'TOGGLE_HIGHLIGHT':
          setHighlight(msg.enabled, cachedDarkPatterns)
          return

        case 'TOGGLE_XRAY':
          if (msg.enabled) {
            injectXRayOverlay(cachedHiddenElements)
          } else {
            removeXRayOverlay()
          }
          return

        case 'LOCATE_ELEMENT': {
          try {
            const el = document.querySelector(msg.selector)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          } catch { /* ignore */ }
          return
        }
      }
    })
  },
})
