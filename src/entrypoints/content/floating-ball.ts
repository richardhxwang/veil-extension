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
      .wrap { position: relative; }
      .ball {
        width: 44px; height: 44px;
        border-radius: 50%;
        background: #22c55e;
        display: flex; align-items: center; justify-content: center;
        color: #fff; font: bold 13px/1 system-ui;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        transition: background 0.3s, transform 0.1s;
        user-select: none; cursor: pointer;
      }
      .ball:hover { transform: scale(1.08); }
      .ball:active { transform: scale(0.95); }
      .tip {
        position: absolute; bottom: 52px; right: 0;
        background: #1e1e2e; color: #fff;
        font: 12px/1.4 system-ui; white-space: nowrap;
        padding: 7px 10px; border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        opacity: 0; transition: opacity 0.2s; pointer-events: none;
      }
      .tip::after {
        content:''; position:absolute; bottom:-6px; right:14px;
        border:6px solid transparent; border-top-color:#1e1e2e; border-bottom:none;
      }
    </style>
    <div class="wrap">
      <div class="ball" id="ball">100</div>
      <div class="tip" id="tip">点击右上角 <b>V</b> 图标打开面板<br>或右键网页选「Open Veil」</div>
    </div>
  `

  scoreEl = shadow.getElementById('ball')

  // 点击显示提示（Chrome 限制：side panel 只能通过扩展图标或右键菜单打开）
  shadow.getElementById('ball')?.addEventListener('click', () => {
    const tip = shadow.getElementById('tip')
    if (tip) {
      tip.style.opacity = '1'
      setTimeout(() => { tip.style.opacity = '0' }, 3000)
    }
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
