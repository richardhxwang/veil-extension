# Veil — Chrome Extension 设计文档

**日期**: 2026-06-08  
**状态**: 待实现  
**核心理念**: 网页对你掩盖的，Veil 全部揭开

---

## 1. 产品概述

Veil 是一个 Chrome 扩展，将四个网页透明度工具融合为统一体验：

1. **🎭 暗模式检测** — 识别操纵性 UI 设计（虚假倒计时、预勾选、羞辱式按钮等）
2. **🕸️ 追踪器可视化** — D3 力导向图展示你的数据被卖给哪些公司
3. **👁️ X 光模式** — 揭示所有被 CSS 隐藏的 DOM 元素
4. **🌌 历史星系图** — 把浏览历史渲染成可交互的力导向星系

**设计原则**：
- 全本地运行，零数据上传，零后端
- 悬浮评分球作为入口，侧边栏承载所有详情
- 每个模块点进去有完整独立体验，退出时自动清除页面注入效果

---

## 2. 架构

### 2.1 扩展组成

```
veil/
├── manifest.json          # MV3
├── background/
│   └── index.ts           # Service Worker：聚合数据、管理评分
├── content/
│   └── index.ts           # 注入悬浮球、执行页面操作（高亮/X光/图谱）
├── sidepanel/
│   ├── index.html
│   └── App.tsx            # 侧边栏 React App（4个模块视图）
├── assets/
│   └── disconnect-db.json # Disconnect 追踪器数据库（本地打包）
└── wxt.config.ts
```

### 2.2 消息流

```
Content Script                Background SW           Side Panel
     │                              │                      │
     │── 页面加载完成 ─────────────>│                      │
     │   { url, domain }            │                      │
     │                              │── 查询 history ──>  │
     │<─ 触发扫描指令 ──────────────│                      │
     │                              │                      │
     │── 扫描结果 ─────────────────>│                      │
     │   { darkPatterns, hidden }   │── 推送评分 ────────>│
     │                              │                      │
     │<─ 模块指令（开启X光等）───────────────────────────>│
     │                              │                      │
```

### 2.3 数据存储

- `chrome.storage.local`：历史图谱缓存、用户设置
- 追踪器数据库：Disconnect tracker list，打包为本地 JSON（约 500KB）
- 无云端存储

---

## 3. 评分算法

```
基础分: 100

扣分项:
  - 每个暗模式陷阱:   -8  (上限 -32)
  - 每个追踪器公司:   -5  (上限 -35)
  - 可疑隐藏元素:     -2  (上限 -20)

加分项:
  - 历史访问频次:     +3 每次  (上限 +10，常去 = 熟悉 = 相对信任)

评分区间:
  🟢 70-100: 绿色，相对干净
  🟡 40-69:  黄色，有套路
  🔴 0-39:   红色，高度警惕
```

---

## 4. UI 设计

### 4.1 悬浮评分球（Content Script 注入）

```
右下角固定定位，32×32px 圆形：
  - 显示综合评分数字
  - 颜色随分数变化（绿/黄/红）
  - 点击 → 打开 Chrome Side Panel
  - 可拖拽换位置
```

### 4.2 侧边栏首页

```
┌─────────────────────────────────┐
│ VEIL              透明度: 67    │
│ ─────────────────────────────── │
│ 🎭 暗模式    ████░░░  3 个陷阱  │
│ 🕸️ 追踪器   ██░░░░░  7 家公司  │
│ 👁️ 隐藏层   ███░░░░  12 个元素 │
│ 🌌 我的轨迹  ██████░  第 8 次   │
│ ─────────────────────────────── │
│ [详情] [详情] [详情] [星图]     │
└─────────────────────────────────┘
```

### 4.3 模块视图（点击详情后）

**🎭 暗模式视图**
- 列表展示每个检测到的暗模式，附类型标签 + 描述
- [开启高亮模式] → Content Script 在页面上红框标注所有暗模式元素
- 点击列表条目 → 页面滚动定位 + 闪烁

**🕸️ 追踪器视图**
- D3 力导向图：当前域名为中心，追踪器公司为周边节点
- 节点大小 = 请求数量，颜色 = 公司类别（广告/数据/分析）
- 点击节点 → 弹出公司信息卡（名称、类别、总部）
- 实时更新（监听新网络请求）

**👁️ X 光视图**
- [开启 X 光模式] 主按钮
- 筛选器：全部 / display:none / opacity:0 / visibility:hidden / 越界隐藏
- 列表展示隐藏元素（选择器、隐藏原因、内容摘要）
- 点击条目 → 定位到元素
- 开启后页面叠加红色半透明蒙版，悬停显示 tooltip

**🌌 星系图视图**
- D3 力导向图：域名为节点（大小=访问频率），导航路径为连线（粗细=跳转次数）
- 颜色渐变：今日=亮白，本周=淡蓝，更早=暗灰
- 时间滑块：今天 / 本周 / 本月
- 节点可拖拽
- 点击节点 → 展开该域名访问时间线

---

## 5. 各模块技术实现

### 5.1 暗模式检测

检测规则（DOM 扫描）：
```typescript
const patterns = [
  { type: '虚假倒计时', selector: '[class*="countdown"],[class*="timer"]',
    // 用 MutationObserver 观察：若元素内容被 JS 持续修改且显示时间 < 60min，判定为虚假倒计时
    validate: (el) => isJsCountdown(el) },
  { type: '预勾选订阅', selector: 'input[type="checkbox"][checked]',
    validate: (el) => isNearPriceElement(el) },
  { type: '羞辱式按钮', selector: 'a,button',
    validate: (el) => isShamePattern(el.textContent) },
  { type: '虚假库存', selector: '[class*="stock"],[class*="inventory"]',
    validate: (el) => isAlwaysLow(el) },
]
```

触发时机：页面 DOMContentLoaded + MutationObserver 监听动态注入

### 5.2 追踪器可视化

```typescript
// Background SW 监听网络请求
chrome.webRequest.onBeforeRequest.addListener(
  (details) => matchTracker(details.url, disconnectDB),
  { urls: ['<all_urls>'] }
)
```

数据源：[Disconnect tracker list](https://github.com/disconnectme/disconnect-tracking-protection)（MIT 协议，打包进扩展）

### 5.3 X 光模式

```typescript
function scanHiddenElements() {
  return [...document.querySelectorAll('*')]
    .filter(el => {
      const s = getComputedStyle(el)
      return s.display === 'none'
        || s.visibility === 'hidden'
        || parseFloat(s.opacity) === 0
        || isOffScreen(el.getBoundingClientRect())
    })
    .filter(el => hasContent(el))  // 排除空元素
}
```

Overlay 注入：绝对定位 div 叠加，mix-blend-mode: multiply

### 5.4 历史星系图

```typescript
// 查询最近 30 天历史
const items = await chrome.history.search({
  text: '', startTime: Date.now() - 30 * 86400000, maxResults: 5000
})
// 按域名聚合，建立跳转关系图
const graph = buildDomainGraph(items)
// D3 力导向渲染
renderForceGraph(graph)
```

---

## 6. 技术栈

| 层 | 技术 |
|----|------|
| 扩展框架 | [WXT](https://wxt.dev/) (支持 HMR，MV3) |
| UI | React 19 + TypeScript |
| 样式 | Tailwind CSS 4 |
| 可视化 | D3.js v7 |
| 追踪器 DB | Disconnect tracker list (本地 JSON) |
| 构建 | Vite (WXT 内置) |
| 包管理 | pnpm |

---

## 7. Chrome 权限清单

```json
{
  "permissions": [
    "history",
    "storage",
    "sidePanel",
    "webRequest",
    "tabs"
  ],
  "host_permissions": ["<all_urls>"]
}
```

---

## 8. MVP 范围

**包含（第一版）**：
- 悬浮评分球 + 侧边栏首页
- 暗模式检测（5 种规则）+ 页面高亮
- 追踪器识别 + D3 力导向图
- X 光模式 + 页面蒙版 + 列表
- 历史星系图（本地，30 天）

**排除（后续迭代）**：
- 跨设备同步
- 用户自定义规则
- 历史导出
- Firefox 支持

---

## 9. 文件结构（实现目标）

```
awesome-extension/
├── src/
│   ├── background/
│   │   └── index.ts
│   ├── content/
│   │   ├── index.ts          # 注入球 + 页面操作
│   │   ├── darkPatterns.ts   # 暗模式扫描
│   │   ├── xray.ts           # X光模式
│   │   └── overlay.ts        # 蒙版注入工具
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── views/
│   │       ├── Home.tsx
│   │       ├── DarkPatterns.tsx
│   │       ├── TrackerMap.tsx
│   │       ├── XRay.tsx
│   │       └── Galaxy.tsx
│   ├── lib/
│   │   ├── scoring.ts
│   │   ├── disconnect.ts     # 追踪器 DB 查询
│   │   └── graph.ts          # D3 图谱工具
│   └── assets/
│       └── disconnect-db.json
├── docs/
│   └── superpowers/specs/
│       └── 2026-06-08-veil-design.md
├── wxt.config.ts
├── package.json
└── tsconfig.json
```
