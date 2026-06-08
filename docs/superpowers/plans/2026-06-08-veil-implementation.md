# Veil Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Veil，一个 Chrome 扩展，通过悬浮评分球 + 侧边栏，融合暗模式检测、追踪器可视化、X 光隐藏元素、历史星系图四大功能，全本地运行零后端。

**Architecture:** Background Service Worker 负责网络监听（追踪器）和历史查询；Content Script 注入悬浮球并执行页面操作（高亮/X光蒙版）；Side Panel 承载 React UI，通过 `chrome.runtime.sendMessage` 与 Background 和 Content 双向通信。

**Tech Stack:** WXT 框架，React 19，TypeScript，Tailwind CSS 4，D3.js v7，Vitest（单元测试），pnpm

---

## 文件结构

```
awesome-extension/
├── src/
│   ├── background/
│   │   └── index.ts              # 服务工作者：追踪器监听、历史查询、评分聚合
│   ├── content/
│   │   ├── index.ts              # 入口：注入悬浮球，路由消息给各模块
│   │   ├── floating-ball.ts      # 悬浮评分球（Shadow DOM 注入）
│   │   ├── dark-patterns.ts      # 暗模式扫描 + 页面高亮
│   │   ├── xray.ts               # X 光扫描 + 蒙版注入
│   │   └── overlay.ts            # 共用：DOM 蒙版 / 高亮工具函数
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx               # 视图路由
│   │   ├── global.css
│   │   └── views/
│   │       ├── Home.tsx          # 评分仪表盘 + 4 个模块摘要卡
│   │       ├── DarkPatterns.tsx  # 暗模式列表 + 高亮开关
│   │       ├── TrackerMap.tsx    # D3 力导向追踪器图
│   │       ├── XRay.tsx          # X 光开关 + 隐藏元素列表
│   │       └── Galaxy.tsx        # D3 历史星系 + 时间滑块
│   └── lib/
│       ├── types.ts              # 所有共用 TypeScript 类型
│       ├── scoring.ts            # 评分算法（纯函数）
│       ├── disconnect.ts         # 追踪器 DB 查询（纯函数）
│       └── dark-pattern-rules.ts # 暗模式检测规则（纯函数）
├── public/
│   └── disconnect-db.json        # 打包进扩展的 Disconnect 追踪器数据库
├── tests/
│   ├── scoring.test.ts
│   ├── disconnect.test.ts
│   └── dark-pattern-rules.test.ts
├── wxt.config.ts
├── vitest.config.ts
└── package.json
```

---

## Task 1: 项目初始化

**Files:**
- Create: `wxt.config.ts`
- Create: `vitest.config.ts`
- Create: `src/sidepanel/global.css`

- [ ] **Step 1: 初始化 WXT 项目**

```bash
cd "/Volumes/SSD Acer M7000/MacMini-Data/Projects/Project/awesome-extension"
pnpm dlx wxt@latest init . --template react-ts
```

出现选项时选：React + TypeScript。完成后目录会有 `src/`、`wxt.config.ts`、`package.json`。

- [ ] **Step 2: 安装依赖**

```bash
pnpm add d3 @types/d3
pnpm add -D tailwindcss @tailwindcss/vite vitest @vitest/ui jsdom @types/jsdom
```

- [ ] **Step 3: 配置 wxt.config.ts**

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Veil',
    description: '揭开网页面纱 — 暗模式、追踪器、隐藏元素、浏览轨迹',
    permissions: ['history', 'storage', 'sidePanel', 'webRequest', 'tabs'],
    host_permissions: ['<all_urls>'],
    action: {},
  },
})
```

- [ ] **Step 4: 配置 Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

在 `package.json` 的 `scripts` 中添加：
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: 配置 Tailwind**

```css
/* src/sidepanel/global.css */
@import "tailwindcss";
```

- [ ] **Step 6: 验证构建**

```bash
pnpm build
```

Expected: `dist/` 目录生成，无报错。

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Veil WXT extension project"
```

---

## Task 2: 共用类型 + 评分算法 (TDD)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/scoring.ts`
- Create: `tests/scoring.test.ts`

- [ ] **Step 1: 定义共用类型**

```typescript
// src/lib/types.ts

export interface DarkPattern {
  type: string           // '虚假倒计时' | '预勾选订阅' | '羞辱式按钮' | '虚假库存'
  element: string        // CSS 选择器（用于定位）
  description: string    // 给用户看的解释
}

export interface TrackerInfo {
  company: string
  category: string       // 'Advertising' | 'Analytics' | 'Social' | 'Content'
  domain: string
}

export interface HiddenElement {
  selector: string
  reason: string         // 'display:none' | 'visibility:hidden' | 'opacity:0' | 'off-screen'
  contentPreview: string // 前 60 个字符
  tagName: string
}

export interface ScoreInput {
  darkPatternCount: number
  trackerCount: number
  hiddenElementCount: number
  visitCount: number     // chrome.history 返回的访问次数
}

export interface ScoreData {
  total: number          // 0-100
  darkPatternCount: number
  trackerCount: number
  hiddenElementCount: number
  visitCount: number
}

// 消息类型（Background ↔ Content ↔ SidePanel）
export type VeilMessage =
  | { type: 'GET_SCORE' }
  | { type: 'SCORE_UPDATE'; data: ScoreData }
  | { type: 'DARK_PATTERNS_RESULT'; patterns: DarkPattern[] }
  | { type: 'TRACKERS_UPDATE'; trackers: TrackerInfo[] }
  | { type: 'HIDDEN_ELEMENTS_RESULT'; elements: HiddenElement[] }
  | { type: 'TOGGLE_HIGHLIGHT'; enabled: boolean }
  | { type: 'TOGGLE_XRAY'; enabled: boolean }
  | { type: 'LOCATE_ELEMENT'; selector: string }
  | { type: 'SCAN_DARK_PATTERNS' }
  | { type: 'SCAN_HIDDEN_ELEMENTS' }

export type ViewName = 'home' | 'darkpatterns' | 'trackers' | 'xray' | 'galaxy'
```

- [ ] **Step 2: 写失败的测试**

```typescript
// tests/scoring.test.ts
import { calculateScore } from '../src/lib/scoring'

describe('calculateScore', () => {
  it('returns 100 for a clean page', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 })).toBe(100)
  })

  it('deducts 8 per dark pattern, capped at 32', () => {
    expect(calculateScore({ darkPatternCount: 2, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 })).toBe(84)
    expect(calculateScore({ darkPatternCount: 10, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 })).toBe(68)
  })

  it('deducts 5 per tracker, capped at 35', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 3, hiddenElementCount: 0, visitCount: 0 })).toBe(85)
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 20, hiddenElementCount: 0, visitCount: 0 })).toBe(65)
  })

  it('deducts 2 per hidden element, capped at 20', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 5, visitCount: 0 })).toBe(90)
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 30, visitCount: 0 })).toBe(80)
  })

  it('adds 3 per visit, capped at 10', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 2 })).toBe(100) // 106, capped at 100
    expect(calculateScore({ darkPatternCount: 5, trackerCount: 5, hiddenElementCount: 5, visitCount: 10 })).toBe(51)
    // 100 - 40 - 25 - 10 + 10 = 35... wait let me recalculate
    // dark: min(5*8,32)=32, tracker: min(5*5,35)=25, hidden: min(5*2,20)=10, visit: min(10*3,10)=10
    // 100 - 32 - 25 - 10 + 10 = 43
  })

  it('never goes below 0', () => {
    expect(calculateScore({ darkPatternCount: 100, trackerCount: 100, hiddenElementCount: 100, visitCount: 0 })).toBe(0)
  })
})
```

- [ ] **Step 3: 运行，确认失败**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '../src/lib/scoring'`

- [ ] **Step 4: 实现评分算法**

```typescript
// src/lib/scoring.ts
import type { ScoreInput } from './types'

export function calculateScore(input: ScoreInput): number {
  const darkPenalty = Math.min(input.darkPatternCount * 8, 32)
  const trackerPenalty = Math.min(input.trackerCount * 5, 35)
  const hiddenPenalty = Math.min(input.hiddenElementCount * 2, 20)
  const historyBonus = Math.min(input.visitCount * 3, 10)
  return Math.max(0, Math.min(100, 100 - darkPenalty - trackerPenalty - hiddenPenalty + historyBonus))
}

export function scoreToColor(score: number): string {
  if (score >= 70) return '#22c55e'  // green-500
  if (score >= 40) return '#eab308'  // yellow-500
  return '#ef4444'                    // red-500
}
```

- [ ] **Step 5: 修正测试中的计算（根据实际算法）**

更新 `tests/scoring.test.ts` 中 `visitCount: 10` 那条：
```typescript
  it('adds 3 per visit, capped at 10', () => {
    expect(calculateScore({ darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 2 })).toBe(100)
    // dark: min(5*8,32)=32, tracker: min(5*5,35)=25, hidden: min(5*2,20)=10, visit: min(10*3,10)=10
    // 100 - 32 - 25 - 10 + 10 = 43
    expect(calculateScore({ darkPatternCount: 5, trackerCount: 5, hiddenElementCount: 5, visitCount: 10 })).toBe(43)
  })
```

- [ ] **Step 6: 运行，确认通过**

```bash
pnpm test
```

Expected: PASS — 5 tests passed

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/scoring.ts tests/scoring.test.ts
git commit -m "feat: add shared types and scoring algorithm with tests"
```

---

## Task 3: Disconnect 追踪器数据库

**Files:**
- Create: `scripts/fetch-disconnect-db.mjs`
- Create: `public/disconnect-db.json`（脚本生成）
- Create: `src/lib/disconnect.ts`
- Create: `tests/disconnect.test.ts`

- [ ] **Step 1: 写脚本下载并处理 Disconnect DB**

```javascript
// scripts/fetch-disconnect-db.mjs
import { writeFileSync } from 'fs'

const URL = 'https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json'

const res = await fetch(URL)
const raw = await res.json()

// 将嵌套结构展平为 Map: domain -> { company, category }
const flat = {}

for (const [category, companies] of Object.entries(raw.categories)) {
  for (const [company, entries] of Object.entries(companies)) {
    for (const domains of Object.values(entries)) {
      for (const domain of domains) {
        flat[domain] = { company, category }
      }
    }
  }
}

writeFileSync('public/disconnect-db.json', JSON.stringify(flat))
console.log(`Done: ${Object.keys(flat).length} tracker domains`)
```

- [ ] **Step 2: 运行脚本生成数据库**

```bash
node scripts/fetch-disconnect-db.mjs
```

Expected: `Done: ~7000 tracker domains`，`public/disconnect-db.json` 生成。

- [ ] **Step 3: 写失败的测试**

```typescript
// tests/disconnect.test.ts
import { buildTrackerDB, matchTracker } from '../src/lib/disconnect'
import type { TrackerInfo } from '../src/lib/types'

const sampleDB: Record<string, { company: string; category: string }> = {
  'doubleclick.net': { company: 'Google', category: 'Advertising' },
  'google-analytics.com': { company: 'Google', category: 'Analytics' },
  'facebook.com': { company: 'Facebook', category: 'Social' },
}

describe('buildTrackerDB', () => {
  it('converts flat json to Map', () => {
    const db = buildTrackerDB(sampleDB)
    expect(db.size).toBe(3)
    expect(db.get('doubleclick.net')?.company).toBe('Google')
  })
})

describe('matchTracker', () => {
  const db = buildTrackerDB(sampleDB)

  it('matches exact domain', () => {
    const result = matchTracker('https://doubleclick.net/pixel', db)
    expect(result?.company).toBe('Google')
    expect(result?.category).toBe('Advertising')
  })

  it('matches subdomain', () => {
    const result = matchTracker('https://stats.google-analytics.com/collect', db)
    expect(result?.company).toBe('Google')
  })

  it('returns null for non-tracker', () => {
    expect(matchTracker('https://example.com/page', db)).toBeNull()
  })

  it('returns null for invalid url', () => {
    expect(matchTracker('not-a-url', db)).toBeNull()
  })
})
```

- [ ] **Step 4: 运行，确认失败**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '../src/lib/disconnect'`

- [ ] **Step 5: 实现追踪器查询**

```typescript
// src/lib/disconnect.ts
import type { TrackerInfo } from './types'

type DisconnectDB = Map<string, { company: string; category: string }>

export function buildTrackerDB(
  raw: Record<string, { company: string; category: string }>
): DisconnectDB {
  return new Map(Object.entries(raw))
}

export function matchTracker(url: string, db: DisconnectDB): TrackerInfo | null {
  try {
    const hostname = new URL(url).hostname
    const parts = hostname.split('.')
    // 从最长到最短依次尝试匹配
    for (let i = 0; i < parts.length - 1; i++) {
      const domain = parts.slice(i).join('.')
      const entry = db.get(domain)
      if (entry) return { ...entry, domain }
    }
    return null
  } catch {
    return null
  }
}
```

- [ ] **Step 6: 运行，确认通过**

```bash
pnpm test
```

Expected: PASS — 7 tests passed

- [ ] **Step 7: Commit**

```bash
git add scripts/fetch-disconnect-db.mjs public/disconnect-db.json src/lib/disconnect.ts tests/disconnect.test.ts
git commit -m "feat: add Disconnect tracker database and query functions"
```

---

## Task 4: 暗模式检测规则 (TDD)

**Files:**
- Create: `src/lib/dark-pattern-rules.ts`
- Create: `tests/dark-pattern-rules.test.ts`

- [ ] **Step 1: 写失败的测试**

```typescript
// tests/dark-pattern-rules.test.ts
import { detectPreCheckedBoxes, detectShamePatterns, detectCountdowns, detectHiddenCancel } from '../src/lib/dark-pattern-rules'

describe('detectPreCheckedBoxes', () => {
  it('finds checked checkbox near price text', () => {
    document.body.innerHTML = `
      <div>
        <p>Total: $99/month</p>
        <label><input type="checkbox" checked id="addon"> Add premium protection</label>
      </div>
    `
    const results = detectPreCheckedBoxes()
    expect(results.length).toBe(1)
    expect(results[0].type).toBe('预勾选订阅')
  })

  it('ignores unchecked checkboxes', () => {
    document.body.innerHTML = `<input type="checkbox" id="terms">`
    expect(detectPreCheckedBoxes()).toHaveLength(0)
  })
})

describe('detectShamePatterns', () => {
  it('detects shame rejection text', () => {
    document.body.innerHTML = `
      <div>
        <button>Yes, save me money</button>
        <a href="#">No, I don't want to save money</a>
      </div>
    `
    const results = detectShamePatterns()
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('羞辱式按钮')
  })
})

describe('detectCountdowns', () => {
  it('detects JS-driven countdown elements', () => {
    document.body.innerHTML = `<div class="countdown-timer">10:00</div>`
    // 模拟 JS 修改内容（MutationObserver 实现在运行时，这里测试选择器识别）
    const results = detectCountdowns()
    expect(results.length).toBe(1)
    expect(results[0].type).toBe('虚假倒计时')
  })
})

describe('detectHiddenCancel', () => {
  it('detects hidden unsubscribe/cancel elements', () => {
    document.body.innerHTML = `
      <button style="display:none">Cancel subscription</button>
    `
    const results = detectHiddenCancel()
    expect(results.length).toBe(1)
    expect(results[0].type).toBe('隐藏取消按钮')
  })
})
```

- [ ] **Step 2: 运行，确认失败**

```bash
pnpm test
```

Expected: FAIL

- [ ] **Step 3: 实现检测规则**

```typescript
// src/lib/dark-pattern-rules.ts
import type { DarkPattern } from './types'

const SHAME_PATTERNS = [
  /no,?\s+i\s+don'?t\s+want/i,
  /no thanks,?\s+i/i,
  /i\s+don'?t\s+want\s+to\s+save/i,
  /不，我不想/i,
  /不需要优惠/i,
]

const PRICE_KEYWORDS = /\$|€|£|¥|price|cost|month|year|plan|subscription|fee/i

export function detectPreCheckedBoxes(): DarkPattern[] {
  const results: DarkPattern[] = []
  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')

  for (const cb of checkboxes) {
    const parent = cb.closest('div,form,section') ?? document.body
    if (PRICE_KEYWORDS.test(parent.textContent ?? '')) {
      const selector = cb.id ? `#${cb.id}` : `input[type="checkbox"]:checked`
      results.push({
        type: '预勾选订阅',
        element: selector,
        description: '已预先勾选的付费选项，需要主动取消勾选才能避免额外收费',
      })
    }
  }
  return results
}

export function detectShamePatterns(): DarkPattern[] {
  const results: DarkPattern[] = []
  const clickables = document.querySelectorAll<HTMLElement>('a,button,span[role="button"]')

  for (const el of clickables) {
    const text = el.textContent?.trim() ?? ''
    if (SHAME_PATTERNS.some(p => p.test(text))) {
      results.push({
        type: '羞辱式按钮',
        element: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
        description: `"${text.slice(0, 50)}" — 用羞辱感迫使用户做出特定选择`,
      })
    }
  }
  return results
}

export function detectCountdowns(): DarkPattern[] {
  const results: DarkPattern[] = []
  const sel = '[class*="countdown"],[class*="timer"],[id*="countdown"],[id*="timer"]'
  const els = document.querySelectorAll(sel)

  for (const el of els) {
    const text = el.textContent?.trim() ?? ''
    // 包含时间格式（数字:数字）
    if (/\d+:\d+/.test(text)) {
      results.push({
        type: '虚假倒计时',
        element: el.id ? `#${el.id}` : sel,
        description: '倒计时可能在刷新后重置，制造虚假紧迫感',
      })
    }
  }
  return results
}

export function detectHiddenCancel(): DarkPattern[] {
  const results: DarkPattern[] = []
  const CANCEL_KEYWORDS = /cancel|unsubscribe|取消|退订|终止/i
  const all = document.querySelectorAll<HTMLElement>('button,a,input[type="button"]')

  for (const el of all) {
    const text = el.textContent?.trim() ?? el.getAttribute('value') ?? ''
    if (!CANCEL_KEYWORDS.test(text)) continue
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      results.push({
        type: '隐藏取消按钮',
        element: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
        description: `"${text.slice(0, 40)}" 被故意隐藏，取消订阅比订阅困难得多`,
      })
    }
  }
  return results
}

export function runAllDetectors(): DarkPattern[] {
  return [
    ...detectPreCheckedBoxes(),
    ...detectShamePatterns(),
    ...detectCountdowns(),
    ...detectHiddenCancel(),
  ]
}
```

- [ ] **Step 4: 运行，确认通过**

```bash
pnpm test
```

Expected: PASS — all tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/dark-pattern-rules.ts tests/dark-pattern-rules.test.ts
git commit -m "feat: add dark pattern detection rules with tests"
```

---

## Task 5: Background Service Worker

**Files:**
- Create: `src/background/index.ts`

- [ ] **Step 1: 实现 Background Service Worker**

```typescript
// src/background/index.ts
import rawDB from '../../public/disconnect-db.json'
import { buildTrackerDB, matchTracker } from '../lib/disconnect'
import { calculateScore } from '../lib/scoring'
import type { ScoreData, TrackerInfo, VeilMessage } from '../lib/types'

const trackerDB = buildTrackerDB(rawDB as Record<string, { company: string; category: string }>)

// 每个标签页的状态
interface TabState {
  trackers: Map<string, TrackerInfo>  // domain -> info（去重）
  darkPatternCount: number
  hiddenElementCount: number
  visitCount: number
}

const tabStates = new Map<number, TabState>()

function getOrCreateTabState(tabId: number): TabState {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      trackers: new Map(),
      darkPatternCount: 0,
      hiddenElementCount: 0,
      visitCount: 0,
    })
  }
  return tabStates.get(tabId)!
}

// 监听网络请求，识别追踪器
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { tabId, url } = details
    if (tabId < 0) return
    const tracker = matchTracker(url, trackerDB)
    if (!tracker) return
    const state = getOrCreateTabState(tabId)
    state.trackers.set(tracker.domain, tracker)
    broadcastScoreUpdate(tabId)
  },
  { urls: ['<all_urls>'] }
)

// 标签页关闭时清理状态
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId)
})

// 标签页导航时重置追踪器（新页面新状态）
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabStates.delete(tabId)
  }
})

async function getVisitCount(url: string): Promise<number> {
  try {
    const visits = await chrome.history.getVisits({ url })
    return visits.length
  } catch {
    return 0
  }
}

async function broadcastScoreUpdate(tabId: number): Promise<void> {
  const state = getOrCreateTabState(tabId)
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!tab?.url) return

  const visitCount = await getVisitCount(tab.url)
  state.visitCount = visitCount

  const scoreData: ScoreData = {
    total: calculateScore({
      darkPatternCount: state.darkPatternCount,
      trackerCount: state.trackers.size,
      hiddenElementCount: state.hiddenElementCount,
      visitCount,
    }),
    darkPatternCount: state.darkPatternCount,
    trackerCount: state.trackers.size,
    hiddenElementCount: state.hiddenElementCount,
    visitCount,
  }

  // 推送给 content script
  chrome.tabs.sendMessage(tabId, { type: 'SCORE_UPDATE', data: scoreData } as VeilMessage).catch(() => {})
  // 推送给 side panel（通过 runtime）
  chrome.runtime.sendMessage({ type: 'SCORE_UPDATE', data: scoreData } as VeilMessage).catch(() => {})
}

// 处理来自 content script / side panel 的消息
chrome.runtime.onMessage.addListener((message: VeilMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id

  if (message.type === 'DARK_PATTERNS_RESULT' && tabId) {
    const state = getOrCreateTabState(tabId)
    state.darkPatternCount = message.patterns.length
    broadcastScoreUpdate(tabId)
  }

  if (message.type === 'HIDDEN_ELEMENTS_RESULT' && tabId) {
    const state = getOrCreateTabState(tabId)
    state.hiddenElementCount = message.elements.length
    broadcastScoreUpdate(tabId)
  }

  if (message.type === 'GET_SCORE') {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab?.id) return
      await broadcastScoreUpdate(tab.id)
    })
  }

  return true
})

// Side panel 打开按钮
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id })
  }
})
```

- [ ] **Step 2: 在 wxt.config.ts 中确认 side panel 配置**

```typescript
// wxt.config.ts — 添加 side_panel 字段
manifest: {
  name: 'Veil',
  description: '揭开网页面纱 — 暗模式、追踪器、隐藏元素、浏览轨迹',
  permissions: ['history', 'storage', 'sidePanel', 'webRequest', 'tabs'],
  host_permissions: ['<all_urls>'],
  side_panel: { default_path: 'sidepanel/index.html' },
  action: {},
},
```

- [ ] **Step 3: 验证构建**

```bash
pnpm build
```

Expected: 无 TypeScript 报错

- [ ] **Step 4: Commit**

```bash
git add src/background/index.ts wxt.config.ts
git commit -m "feat: add background service worker with tracker monitoring and scoring"
```

---

## Task 6: Content Script — 悬浮球 + 页面操作

**Files:**
- Create: `src/content/overlay.ts`
- Create: `src/content/dark-patterns.ts`
- Create: `src/content/xray.ts`
- Create: `src/content/floating-ball.ts`
- Create: `src/content/index.ts`

- [ ] **Step 1: 实现 Overlay 工具**

```typescript
// src/content/overlay.ts

const OVERLAY_ATTR = 'data-veil-overlay'

// color: hex string like '#ef4444'
export function injectOverlay(el: Element, color: string, label: string): void {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return

  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const overlay = document.createElement('div')
  overlay.setAttribute(OVERLAY_ATTR, 'true')
  overlay.style.cssText = `
    position: fixed;
    left: ${rect.left + window.scrollX}px;
    top: ${rect.top + window.scrollY}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    background: rgba(${r},${g},${b},0.35);
    pointer-events: none;
    z-index: 2147483646;
    border: 2px solid rgba(${r},${g},${b},0.8);
    border-radius: 2px;
  `
  const tooltip = document.createElement('div')
  tooltip.style.cssText = `
    position: absolute;
    top: -24px;
    left: 0;
    background: #1a1a1a;
    color: white;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
    font-family: monospace;
  `
  tooltip.textContent = label
  overlay.appendChild(tooltip)
  document.body.appendChild(overlay)
}

export function clearOverlays(): void {
  document.querySelectorAll(`[${OVERLAY_ATTR}]`).forEach(el => el.remove())
}

export function scrollToSelector(selector: string): void {
  const el = document.querySelector(selector)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.animate([{ outline: '3px solid #ef4444' }, { outline: 'none' }], { duration: 1500 })
}
```

- [ ] **Step 2: 实现 Content Script 的暗模式高亮**

```typescript
// src/content/dark-patterns.ts
import { runAllDetectors } from '../lib/dark-pattern-rules'
import { injectOverlay, clearOverlays } from './overlay'
import type { DarkPattern } from '../lib/types'

let highlightEnabled = false

export function scanDarkPatterns(): DarkPattern[] {
  return runAllDetectors()
}

export function toggleHighlight(enabled: boolean, patterns: DarkPattern[]): void {
  highlightEnabled = enabled
  clearOverlays()
  if (!enabled) return
  for (const pattern of patterns) {
    const el = document.querySelector(pattern.element)
    if (el) injectOverlay(el, '#ef4444', `⚠️ ${pattern.type}`)
  }
}
```

- [ ] **Step 3: 实现 X 光模式**

```typescript
// src/content/xray.ts
import { injectOverlay, clearOverlays } from './overlay'
import type { HiddenElement } from '../lib/types'

function isOffScreen(rect: DOMRect): boolean {
  return rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth + 200 || rect.top > window.innerHeight + 200
}

function hasContent(el: Element): boolean {
  if (['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'NOSCRIPT'].includes(el.tagName)) return false
  const text = el.textContent?.trim() ?? ''
  if (text.length > 3) return true
  return el.querySelectorAll('img,svg,video,canvas').length > 0
}

export function scanHiddenElements(): HiddenElement[] {
  const results: HiddenElement[] = []
  const all = document.querySelectorAll('*')

  for (const el of all) {
    if (!hasContent(el)) continue
    const style = getComputedStyle(el)
    const rect = el.getBoundingClientRect()

    let reason = ''
    if (style.display === 'none') reason = 'display:none'
    else if (style.visibility === 'hidden') reason = 'visibility:hidden'
    else if (parseFloat(style.opacity) === 0) reason = 'opacity:0'
    else if (isOffScreen(rect)) reason = 'off-screen'

    if (!reason) continue

    const selector = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')}`
    results.push({
      selector,
      reason,
      contentPreview: (el.textContent?.trim() ?? '').slice(0, 60),
      tagName: el.tagName.toLowerCase(),
    })
  }
  return results
}

export function activateXRay(elements: HiddenElement[]): void {
  clearOverlays()
  for (const item of elements) {
    const el = document.querySelector(item.selector)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    injectOverlay(el, '#9333ea', `👁 ${item.reason}: ${item.contentPreview.slice(0, 30)}`)
  }
}

export function deactivateXRay(): void {
  clearOverlays()
}
```

- [ ] **Step 4: 实现悬浮球**

```typescript
// src/content/floating-ball.ts
import { scoreToColor } from '../lib/scoring'

let ball: HTMLElement | null = null
let isDragging = false
let dragOffsetX = 0
let dragOffsetY = 0

export function injectFloatingBall(): void {
  if (document.getElementById('veil-ball')) return

  const shadow = document.createElement('div')
  shadow.id = 'veil-ball-host'
  const root = shadow.attachShadow({ mode: 'closed' })

  ball = document.createElement('div')
  ball.id = 'veil-ball'
  ball.textContent = '…'
  ball.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #374151;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    font-family: -apple-system, sans-serif;
    cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    user-select: none;
    transition: background 0.3s;
  `

  ball.addEventListener('mousedown', (e) => {
    isDragging = true
    dragOffsetX = e.clientX - ball!.getBoundingClientRect().left
    dragOffsetY = e.clientY - ball!.getBoundingClientRect().top
    e.preventDefault()
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !ball) return
    ball.style.left = `${e.clientX - dragOffsetX}px`
    ball.style.top = `${e.clientY - dragOffsetY}px`
    ball.style.right = 'auto'
    ball.style.bottom = 'auto'
  })

  document.addEventListener('mouseup', () => { isDragging = false })

  ball.addEventListener('click', () => {
    if (!isDragging) chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' })
  })

  root.appendChild(ball)
  document.body.appendChild(shadow)
}

export function updateBallScore(score: number): void {
  if (!ball) return
  ball.textContent = String(score)
  ball.style.background = scoreToColor(score)
}
```

- [ ] **Step 5: 实现 Content Script 入口**

```typescript
// src/content/index.ts
import { injectFloatingBall, updateBallScore } from './floating-ball'
import { scanDarkPatterns, toggleHighlight } from './dark-patterns'
import { scanHiddenElements, activateXRay, deactivateXRay } from './xray'
import { scrollToSelector } from './overlay'
import type { VeilMessage, DarkPattern, HiddenElement } from '../lib/types'

let cachedPatterns: DarkPattern[] = []
let cachedHiddenElements: HiddenElement[] = []

// 注入悬浮球
injectFloatingBall()

// 页面加载完成后扫描
window.addEventListener('load', () => {
  const patterns = scanDarkPatterns()
  cachedPatterns = patterns
  chrome.runtime.sendMessage({ type: 'DARK_PATTERNS_RESULT', patterns } as VeilMessage)

  const elements = scanHiddenElements()
  cachedHiddenElements = elements
  chrome.runtime.sendMessage({ type: 'HIDDEN_ELEMENTS_RESULT', elements } as VeilMessage)
})

// 监听来自 Background 和 SidePanel 的消息
chrome.runtime.onMessage.addListener((message: VeilMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'SCORE_UPDATE':
      updateBallScore(message.data.total)
      break
    case 'TOGGLE_HIGHLIGHT':
      toggleHighlight(message.enabled, cachedPatterns)
      break
    case 'TOGGLE_XRAY':
      if (message.enabled) activateXRay(cachedHiddenElements)
      else deactivateXRay()
      break
    case 'LOCATE_ELEMENT':
      scrollToSelector(message.selector)
      break
    // Side panel 请求扫描结果 — 用 sendResponse 直接回传
    case 'SCAN_DARK_PATTERNS':
      sendResponse(cachedPatterns)
      return true
    case 'SCAN_HIDDEN_ELEMENTS':
      sendResponse(cachedHiddenElements)
      return true
  }
})
```

- [ ] **Step 6: 构建验证**

```bash
pnpm build
```

Expected: 无报错

- [ ] **Step 7: Commit**

```bash
git add src/content/
git commit -m "feat: add content script with floating ball, dark pattern highlight, x-ray mode"
```

---

## Task 7: Side Panel — React Shell + Home 视图

**Files:**
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/main.tsx`
- Create: `src/sidepanel/App.tsx`
- Create: `src/sidepanel/views/Home.tsx`

- [ ] **Step 1: 创建 sidepanel HTML**

```html
<!-- src/sidepanel/index.html -->
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Veil</title>
</head>
<body class="m-0 p-0 bg-gray-950 text-gray-100 h-screen overflow-hidden">
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 main.tsx**

```tsx
// src/sidepanel/main.tsx
import { createRoot } from 'react-dom/client'
import App from './App'
import './global.css'

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 3: 创建 App.tsx（视图路由）**

```tsx
// src/sidepanel/App.tsx
import { useState, useEffect } from 'react'
import Home from './views/Home'
import DarkPatterns from './views/DarkPatterns'
import TrackerMap from './views/TrackerMap'
import XRay from './views/XRay'
import Galaxy from './views/Galaxy'
import type { ScoreData, ViewName } from '../lib/types'

export default function App() {
  const [view, setView] = useState<ViewName>('home')
  const [score, setScore] = useState<ScoreData>({
    total: 0, darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 0,
  })

  useEffect(() => {
    // 请求当前分数
    chrome.runtime.sendMessage({ type: 'GET_SCORE' })
    // 监听分数更新
    const listener = (message: any) => {
      if (message.type === 'SCORE_UPDATE') setScore(message.data)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const goBack = () => setView('home')

  return (
    <div className="flex flex-col h-screen">
      {view === 'home' && <Home score={score} onNavigate={setView} />}
      {view === 'darkpatterns' && <DarkPatterns onBack={goBack} />}
      {view === 'trackers' && <TrackerMap onBack={goBack} />}
      {view === 'xray' && <XRay onBack={goBack} />}
      {view === 'galaxy' && <Galaxy onBack={goBack} />}
    </div>
  )
}
```

- [ ] **Step 4: 创建 Home.tsx**

```tsx
// src/sidepanel/views/Home.tsx
import { scoreToColor } from '../../lib/scoring'
import type { ScoreData, ViewName } from '../../lib/types'

interface Props {
  score: ScoreData
  onNavigate: (view: ViewName) => void
}

function ModuleCard({ icon, label, value, unit, onClick }: {
  icon: string; label: string; value: number; unit: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-white font-semibold">{value}</span>
        <span className="text-gray-400 text-xs ml-1">{unit}</span>
        <span className="text-gray-500 text-xs ml-2">→</span>
      </div>
    </button>
  )
}

export default function Home({ score, onNavigate }: Props) {
  const color = scoreToColor(score.total)
  const label = score.total >= 70 ? '相对干净' : score.total >= 40 ? '有套路' : '高度警惕'

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* 评分圆 */}
      <div className="flex flex-col items-center py-6 gap-2">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4"
          style={{ borderColor: color, color }}
        >
          {score.total}
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-widest">透明度评分</div>
        <div className="text-sm font-medium" style={{ color }}>{label}</div>
      </div>

      {/* 四个模块卡 */}
      <div className="flex flex-col gap-2">
        <ModuleCard icon="🎭" label="暗模式陷阱" value={score.darkPatternCount} unit="个" onClick={() => onNavigate('darkpatterns')} />
        <ModuleCard icon="🕸️" label="追踪器公司" value={score.trackerCount} unit="家" onClick={() => onNavigate('trackers')} />
        <ModuleCard icon="👁️" label="隐藏元素" value={score.hiddenElementCount} unit="个" onClick={() => onNavigate('xray')} />
        <ModuleCard icon="🌌" label="历史轨迹" value={score.visitCount} unit="次访问" onClick={() => onNavigate('galaxy')} />
      </div>

      {/* 底部 */}
      <div className="mt-auto text-center text-xs text-gray-600">
        VEIL · 全本地运行 · 零数据上传
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 构建验证**

```bash
pnpm build
```

Expected: 无报错，`dist/sidepanel/` 目录生成

- [ ] **Step 6: Commit**

```bash
git add src/sidepanel/
git commit -m "feat: add side panel shell with home dashboard view"
```

---

## Task 8: 暗模式详情视图

**Files:**
- Create: `src/sidepanel/views/DarkPatterns.tsx`

- [ ] **Step 1: 实现暗模式视图**

```tsx
// src/sidepanel/views/DarkPatterns.tsx
import { useState, useEffect } from 'react'
import type { DarkPattern, VeilMessage } from '../../lib/types'

interface Props { onBack: () => void }

const PATTERN_ICONS: Record<string, string> = {
  '预勾选订阅': '✅',
  '羞辱式按钮': '😤',
  '虚假倒计时': '⏱️',
  '隐藏取消按钮': '🙈',
}

export default function DarkPatterns({ onBack }: Props) {
  const [patterns, setPatterns] = useState<DarkPattern[]>([])
  const [highlightOn, setHighlightOn] = useState(false)

  useEffect(() => {
    // 用 sendMessage callback 直接拿 content script 缓存的结果
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_DARK_PATTERNS' } as VeilMessage, (patterns) => {
        if (chrome.runtime.lastError) return
        setPatterns(patterns ?? [])
      })
    })
  }, [])

  function toggleHighlight() {
    const next = !highlightOn
    setHighlightOn(next)
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_HIGHLIGHT', enabled: next } as VeilMessage)
    })
  }

  function locateElement(selector: string) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'LOCATE_ELEMENT', selector } as VeilMessage)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
        <span className="text-lg">🎭</span>
        <span className="font-semibold">暗模式检测</span>
        <span className="ml-auto text-xs text-gray-500">发现 {patterns.length} 个</span>
      </div>

      {/* 高亮按钮 */}
      <div className="p-4">
        <button
          onClick={toggleHighlight}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
            highlightOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {highlightOn ? '🔴 关闭高亮模式' : '🔦 开启页面高亮'}
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-4">
        {patterns.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">未检测到暗模式 ✓</div>
        )}
        {patterns.map((p, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span>{PATTERN_ICONS[p.type] ?? '⚠️'}</span>
              <span className="text-sm font-medium text-red-400">{p.type}</span>
            </div>
            <p className="text-xs text-gray-400">{p.description}</p>
            <button
              onClick={() => locateElement(p.element)}
              className="text-xs text-blue-400 hover:text-blue-300 text-left mt-1"
            >
              定位到元素 →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 构建验证**

```bash
pnpm build
```

Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add src/sidepanel/views/DarkPatterns.tsx
git commit -m "feat: add dark patterns detail view with page highlight control"
```

---

## Task 9: 追踪器地图视图 (D3)

**Files:**
- Create: `src/sidepanel/views/TrackerMap.tsx`

- [ ] **Step 1: 实现 D3 力导向追踪器图**

```tsx
// src/sidepanel/views/TrackerMap.tsx
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { TrackerInfo } from '../../lib/types'

interface Props { onBack: () => void }

const CATEGORY_COLORS: Record<string, string> = {
  Advertising: '#ef4444',
  Analytics: '#f59e0b',
  Social: '#3b82f6',
  Content: '#8b5cf6',
  Disconnect: '#6b7280',
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  category: string
  isCenter?: boolean
  size: number
}
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {}

export default function TrackerMap({ onBack }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [trackers, setTrackers] = useState<TrackerInfo[]>([])
  const [selected, setSelected] = useState<TrackerInfo | null>(null)

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'TRACKERS_UPDATE') setTrackers(message.trackers)
      if (message.type === 'SCORE_UPDATE') {
        // score update carries tracker list via background
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    if (!svgRef.current || trackers.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current.clientWidth
    const H = svgRef.current.clientHeight

    const nodes: GraphNode[] = [
      { id: 'you', label: '当前网站', category: 'center', isCenter: true, size: 20 },
      ...trackers.map(t => ({ id: t.domain, label: t.company, category: t.category, size: 10 })),
    ]
    const links: GraphLink[] = trackers.map(t => ({ source: 'you', target: t.domain }))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(W / 2, H / 2))

    const link = svg.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', '#374151').attr('stroke-width', 1)

    const node = svg.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.isCenter ? '#fff' : (CATEGORY_COLORS[d.category] ?? '#6b7280'))
      .attr('cursor', 'pointer')
      .on('click', (_, d) => {
        if (!d.isCenter) setSelected(trackers.find(t => t.domain === d.id) ?? null)
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    const label = svg.append('g').selectAll('text').data(nodes).join('text')
      .text(d => d.label)
      .attr('font-size', 9).attr('fill', '#9ca3af').attr('text-anchor', 'middle').attr('dy', '1.5em')

    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      node.attr('cx', d => d.x!).attr('cy', d => d.y!)
      label.attr('x', d => d.x!).attr('y', d => d.y!)
    })
  }, [trackers])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
        <span className="text-lg">🕸️</span>
        <span className="font-semibold">追踪器地图</span>
        <span className="ml-auto text-xs text-gray-500">{trackers.length} 家公司</span>
      </div>

      <svg ref={svgRef} className="flex-1 w-full" />

      {selected && (
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-sm">{selected.company}</div>
              <div className="text-xs text-gray-400">{selected.domain}</div>
            </div>
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: CATEGORY_COLORS[selected.category] ?? '#6b7280' }}
            >{selected.category}</span>
          </div>
          <button onClick={() => setSelected(null)} className="text-xs text-gray-500 mt-2">关闭 ×</button>
        </div>
      )}

      {trackers.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          未检测到追踪器 ✓
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 在 background 中广播 trackers 列表给 side panel**

在 `src/background/index.ts` 的 `broadcastScoreUpdate` 函数末尾添加：

```typescript
// broadcastScoreUpdate 中，在 sendMessage 后添加：
const trackerList = Array.from(state.trackers.values())
chrome.runtime.sendMessage({ type: 'TRACKERS_UPDATE', trackers: trackerList } as VeilMessage).catch(() => {})
```

- [ ] **Step 3: 构建验证**

```bash
pnpm build
```

Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/views/TrackerMap.tsx src/background/index.ts
git commit -m "feat: add D3 tracker force graph view with node click detail"
```

---

## Task 10: X 光视图

**Files:**
- Create: `src/sidepanel/views/XRay.tsx`

- [ ] **Step 1: 实现 X 光视图**

```tsx
// src/sidepanel/views/XRay.tsx
import { useState, useEffect } from 'react'
import type { HiddenElement, VeilMessage } from '../../lib/types'

interface Props { onBack: () => void }

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  'display:none':     { label: 'display:none',      color: 'text-red-400' },
  'visibility:hidden':{ label: 'visibility:hidden', color: 'text-orange-400' },
  'opacity:0':        { label: 'opacity:0',         color: 'text-yellow-400' },
  'off-screen':       { label: '越界隐藏',           color: 'text-purple-400' },
}

type FilterType = 'all' | 'display:none' | 'visibility:hidden' | 'opacity:0' | 'off-screen'

export default function XRay({ onBack }: Props) {
  const [elements, setElements] = useState<HiddenElement[]>([])
  const [xrayOn, setXrayOn] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_HIDDEN_ELEMENTS' } as VeilMessage, (elements) => {
        if (chrome.runtime.lastError) return
        setElements(elements ?? [])
      })
    })
  }, [])

  function toggleXRay() {
    const next = !xrayOn
    setXrayOn(next)
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_XRAY', enabled: next } as VeilMessage)
    })
  }

  function locateElement(selector: string) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'LOCATE_ELEMENT', selector } as VeilMessage)
    })
  }

  const filtered = filter === 'all' ? elements : elements.filter(e => e.reason === filter)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
        <span className="text-lg">👁️</span>
        <span className="font-semibold">X 光模式</span>
        <span className="ml-auto text-xs text-gray-500">{elements.length} 个隐藏元素</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <button
          onClick={toggleXRay}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
            xrayOn ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {xrayOn ? '🔦 关闭 X 光' : '🔦 开启 X 光'}
        </button>

        <div className="flex gap-1 flex-wrap">
          {(['all', 'display:none', 'visibility:hidden', 'opacity:0', 'off-screen'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2 py-1 rounded ${filter === f ? 'bg-purple-600' : 'bg-gray-700'}`}
            >
              {f === 'all' ? '全部' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-4">
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            {elements.length === 0 ? '未发现隐藏元素 ✓' : '此筛选条件下无结果'}
          </div>
        )}
        {filtered.map((el, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <code className="text-xs text-gray-300">{el.tagName}</code>
              <span className={`text-xs ${REASON_LABELS[el.reason]?.color ?? 'text-gray-400'}`}>
                {REASON_LABELS[el.reason]?.label ?? el.reason}
              </span>
            </div>
            {el.contentPreview && (
              <p className="text-xs text-gray-500 truncate">"{el.contentPreview}"</p>
            )}
            <button
              onClick={() => locateElement(el.selector)}
              className="text-xs text-blue-400 hover:text-blue-300 text-left mt-1"
            >
              定位到元素 →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sidepanel/views/XRay.tsx
git commit -m "feat: add X-ray hidden element view with filter and page locate"
```

---

## Task 11: 历史星系图 (D3)

**Files:**
- Create: `src/sidepanel/views/Galaxy.tsx`

- [ ] **Step 1: 实现历史星系图**

```tsx
// src/sidepanel/views/Galaxy.tsx
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface Props { onBack: () => void }

interface DomainNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  count: number
  lastVisit: number
}
interface DomainLink extends d3.SimulationLinkDatum<DomainNode> {
  weight: number
}

type TimeRange = 'today' | 'week' | 'month'

function getDomainFromUrl(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function timeRangeStart(range: TimeRange): number {
  const now = Date.now()
  if (range === 'today') return now - 86400000
  if (range === 'week') return now - 7 * 86400000
  return now - 30 * 86400000
}

function nodeColor(node: DomainNode, now: number): string {
  const age = now - node.lastVisit
  if (age < 86400000) return '#ffffff'
  if (age < 7 * 86400000) return '#93c5fd'
  return '#4b5563'
}

export default function Galaxy({ onBack }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [range, setRange] = useState<TimeRange>('week')
  const [selected, setSelected] = useState<DomainNode | null>(null)
  const [visitHistory, setVisitHistory] = useState<chrome.history.VisitItem[]>([])

  useEffect(() => {
    const startTime = timeRangeStart(range)
    chrome.history.search({ text: '', startTime, maxResults: 5000 }, (items) => {
      buildAndRender(items, startTime)
    })
  }, [range])

  function buildAndRender(items: chrome.history.HistoryItem[], startTime: number) {
    if (!svgRef.current) return
    const now = Date.now()

    // 聚合节点
    const domainMap = new Map<string, DomainNode>()
    for (const item of items) {
      if (!item.url || !item.lastVisitTime) continue
      if (item.lastVisitTime < startTime) continue
      const domain = getDomainFromUrl(item.url)
      const existing = domainMap.get(domain)
      if (existing) {
        existing.count += item.visitCount ?? 1
        existing.lastVisit = Math.max(existing.lastVisit, item.lastVisitTime)
      } else {
        domainMap.set(domain, { id: domain, label: domain.replace('www.', ''), count: item.visitCount ?? 1, lastVisit: item.lastVisitTime })
      }
    }

    const nodes = Array.from(domainMap.values()).slice(0, 80) // 最多 80 个节点
    const nodeIds = new Set(nodes.map(n => n.id))

    // 简化连线：按访问时间排序，相邻域名连线
    const sorted = [...items].filter(i => i.url && nodeIds.has(getDomainFromUrl(i.url ?? '')))
      .sort((a, b) => (a.lastVisitTime ?? 0) - (b.lastVisitTime ?? 0))

    const linkMap = new Map<string, DomainLink>()
    for (let i = 1; i < sorted.length; i++) {
      const src = getDomainFromUrl(sorted[i - 1].url ?? '')
      const tgt = getDomainFromUrl(sorted[i].url ?? '')
      if (src === tgt || !nodeIds.has(src) || !nodeIds.has(tgt)) continue
      const key = [src, tgt].sort().join('|')
      const link = linkMap.get(key)
      if (link) link.weight++
      else linkMap.set(key, { source: src, target: tgt, weight: 1 })
    }
    const links = Array.from(linkMap.values())

    renderGraph(nodes, links, now)
  }

  function renderGraph(nodes: DomainNode[], links: DomainLink[], now: number) {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()

    const W = svgRef.current!.clientWidth
    const H = svgRef.current!.clientHeight
    const maxCount = Math.max(...nodes.map(n => n.count), 1)

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(20))

    const link = svg.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', '#1f2937')
      .attr('stroke-width', (d: any) => Math.min(d.weight, 4))

    const node = svg.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', d => 4 + (d.count / maxCount) * 14)
      .attr('fill', d => nodeColor(d, now))
      .attr('opacity', 0.85)
      .attr('cursor', 'pointer')
      .on('click', (_, d) => setSelected(d))
      .call(d3.drag<SVGCircleElement, DomainNode>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    const label = svg.append('g').selectAll('text').data(nodes.filter(n => n.count > 2)).join('text')
      .text(d => d.label.length > 15 ? d.label.slice(0, 14) + '…' : d.label)
      .attr('font-size', 9).attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('dy', '-0.8em')

    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      node.attr('cx', d => d.x!).attr('cy', d => d.y!)
      label.attr('x', d => d.x!).attr('y', d => d.y!)
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button onClick={onBack} className="text-gray-400 hover:text-white">←</button>
        <span className="text-lg">🌌</span>
        <span className="font-semibold">历史星系</span>
        <div className="ml-auto flex gap-1">
          {(['today', 'week', 'month'] as TimeRange[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-xs px-2 py-1 rounded ${range === r ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              {r === 'today' ? '今日' : r === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
      </div>

      <svg ref={svgRef} className="flex-1 w-full bg-gray-950" />

      {selected && (
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-sm">{selected.label}</div>
              <div className="text-xs text-gray-400">共访问 {selected.count} 次</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-gray-500">关闭 ×</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 构建验证**

```bash
pnpm build
```

Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add src/sidepanel/views/Galaxy.tsx
git commit -m "feat: add D3 history galaxy view with time range filter"
```

---

## Task 12: 集成测试 + 手动验证

- [ ] **Step 1: 构建生产包**

```bash
pnpm build
```

Expected: `dist/` 目录完整生成，无报错

- [ ] **Step 2: 在 Chrome 中加载扩展**

1. 打开 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点「加载已解压的扩展程序」→ 选择 `dist/` 目录
4. 确认 Veil 图标出现在工具栏

- [ ] **Step 3: 验证悬浮球**

打开任意电商网站（如 amazon.com），确认：
- 右下角出现评分球
- 评分非 0
- 可拖拽移动

- [ ] **Step 4: 验证追踪器检测**

在 nytimes.com 或 amazon.com，点击工具栏 Veil 图标打开侧边栏，确认：
- Home 视图显示追踪器数量 > 0
- 点「追踪器公司」→ D3 图谱渲染出节点
- 节点可拖拽，点击节点显示公司信息卡

- [ ] **Step 5: 验证暗模式检测**

在有预选 checkbox 的购物网站：
- 点「暗模式陷阱」→ 点「开启页面高亮」
- 确认页面上出现红色标注

- [ ] **Step 6: 验证 X 光模式**

在任意网站：
- 点「隐藏元素」→ 点「开启 X 光」
- 确认页面上出现紫色蒙版
- 侧边栏列表显示隐藏元素

- [ ] **Step 7: 验证历史星系**

- 点「历史轨迹」→ 星系图渲染
- 切换时间范围（今日/本周/本月）→ 图谱更新
- 点击节点 → 底部显示详情

- [ ] **Step 8: 跑所有单元测试**

```bash
pnpm test
```

Expected: PASS — all tests passed

- [ ] **Step 9: 最终 Commit**

```bash
git add -A
git commit -m "feat: Veil v1.0 — dark patterns, tracker map, x-ray, history galaxy"
```

---

## 快速参考

### 本地开发

```bash
pnpm dev          # 开发模式（HMR）
pnpm build        # 生产构建
pnpm test         # 单元测试
pnpm test:watch   # 监听模式
```

### 加载到 Chrome

```
chrome://extensions/ → 开发者模式 → 加载已解压 → 选 dist/
```

### 消息类型速查

| 发送方 | 接收方 | 消息类型 |
|--------|--------|---------|
| Background | Content | `SCORE_UPDATE` |
| Background | SidePanel | `SCORE_UPDATE`, `TRACKERS_UPDATE` |
| SidePanel | Background | `GET_SCORE` |
| SidePanel | Content | `TOGGLE_HIGHLIGHT`, `TOGGLE_XRAY`, `LOCATE_ELEMENT` |
| Content | Background | `DARK_PATTERNS_RESULT`, `HIDDEN_ELEMENTS_RESULT` |
