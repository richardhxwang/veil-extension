// src/entrypoints/content/floating-ball.ts
import { scoreToColor } from '../../lib/scoring'

let shadowHost: HTMLElement | null = null
let scoreEl: HTMLElement | null = null

export function injectFloatingBall(): void {
  if (document.getElementById('__veil_ball__')) return

  shadowHost = document.createElement('div')
  shadowHost.id = '__veil_ball__'
  shadowHost.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;cursor:pointer;'

  const shadow = shadowHost.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      .ball {
        width: 40px; height: 40px;
        border-radius: 50%;
        background: #22c55e;
        display: flex; align-items: center; justify-content: center;
        color: #fff; font: bold 14px/1 system-ui;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        transition: background 0.3s, transform 0.1s;
        user-select: none;
      }
      .ball:hover { transform: scale(1.1); }
      .ball:active { transform: scale(0.95); }
    </style>
    <div class="ball" id="ball">100</div>
  `

  scoreEl = shadow.getElementById('ball')

  // 点击打开 side panel
  shadow.getElementById('ball')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_SCORE' })
    // 在 MV3 中通过 chrome.sidePanel.open 打开（background 处理）
    chrome.runtime.sendMessage({ type: '_OPEN_PANEL' })
  })

  document.body.appendChild(shadowHost)
}

export function updateBallScore(score: number): void {
  if (!scoreEl) return
  scoreEl.textContent = String(score)
  scoreEl.style.background = scoreToColor(score)
}

export function removeFloatingBall(): void {
  shadowHost?.remove()
  shadowHost = null
  scoreEl = null
}
