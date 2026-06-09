import { scoreToColor } from '../../lib/scoring'

let shadowHost: HTMLElement | null = null
let scoreEl: HTMLElement | null = null
let ringEl: SVGCircleElement | null = null

export function injectFloatingBall(): void {
  if (document.getElementById('__veil_ball__')) return

  shadowHost = document.createElement('div')
  shadowHost.id = '__veil_ball__'
  shadowHost.style.cssText = 'position:fixed;bottom:28px;right:20px;z-index:2147483647;cursor:pointer;'

  const shadow = shadowHost.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      .wrap { position: relative; }
      .ball {
        width: 52px; height: 52px;
        border-radius: 50%;
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        user-select: none; cursor: pointer;
        position: relative;
      }
      .ball:hover {
        transform: scale(1.06);
        box-shadow: 0 8px 28px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9);
      }
      .ball:active { transform: scale(0.94); }
      .ring-svg {
        position: absolute; top: 0; left: 0;
        width: 52px; height: 52px;
        transform: rotate(-90deg);
        pointer-events: none;
      }
      .ring-bg { fill: none; stroke: rgba(0,0,0,0.06); stroke-width: 3; }
      .ring-fg { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease, stroke 0.4s ease; }
      .score-text {
        font: 600 14px/1 -apple-system, sans-serif;
        color: #1C1C1E;
        position: relative; z-index: 1;
        letter-spacing: -0.5px;
      }
      .tip {
        position: absolute; bottom: 60px; right: 0;
        background: rgba(28,28,30,0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        color: #fff;
        font: 12px/1.5 -apple-system, sans-serif;
        white-space: nowrap;
        padding: 8px 12px; border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        opacity: 0; transition: opacity 0.2s; pointer-events: none;
      }
      .tip::after {
        content:''; position:absolute; bottom:-5px; right:18px;
        border:5px solid transparent; border-top-color:rgba(28,28,30,0.92); border-bottom:none;
      }
    </style>
    <div class="wrap">
      <div class="ball" id="ball">
        <svg class="ring-svg" viewBox="0 0 52 52">
          <circle class="ring-bg" cx="26" cy="26" r="22"/>
          <circle class="ring-fg" id="ring" cx="26" cy="26" r="22"
            stroke="#34C759"
            stroke-dasharray="138.23"
            stroke-dashoffset="0"/>
        </svg>
        <span class="score-text" id="score">100</span>
      </div>
      <div class="tip" id="tip">点击右上角 <b>V</b> 图标打开面板<br>或右键网页选「Open Veil」</div>
    </div>
  `

  scoreEl = shadow.getElementById('score')
  ringEl = shadow.getElementById('ring') as SVGCircleElement

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
  const color = scoreToColor(score)
  if (ringEl) {
    const circ = 2 * Math.PI * 22  // 138.23
    ringEl.style.stroke = color
    ringEl.style.strokeDashoffset = String(circ * (1 - score / 100))
  }
}

export function removeFloatingBall(): void {
  shadowHost?.remove()
  shadowHost = null
  scoreEl = null
  ringEl = null
}
