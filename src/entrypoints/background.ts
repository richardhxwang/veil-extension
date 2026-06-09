// src/entrypoints/background.ts
import { buildTrackerDB, matchTracker } from '../lib/disconnect'
import { calculateScore } from '../lib/scoring'
import type { TrackerInfo, VeilMessage, ScoreData } from '../lib/types'

export default defineBackground(() => {
  // 右键菜单打开侧边栏（右键菜单是合法用户手势，可以调用 sidePanel.open）
  chrome.contextMenus.create({
    id: 'open-veil',
    title: 'Open Veil 隐私面板',
    contexts: ['all'],
  })
  chrome.contextMenus.onClicked.addListener((_, tab) => {
    if (tab?.id) chrome.sidePanel.open({ tabId: tab.id }).catch(() => { /* restricted page */ })
  })

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})

  // 状态：每个 tab 的追踪器集合（company 去重）
  const tabTrackers = new Map<number, Map<string, TrackerInfo>>()
  // 状态：每个 tab 的暗模式/隐藏元素计数
  const tabDarkPatternCount = new Map<number, number>()
  const tabHiddenElementCount = new Map<number, number>()
  // 状态：每个 tab 的域名历史访问次数
  const tabVisitCount = new Map<number, number>()

  // 加载 Disconnect DB
  let db: ReturnType<typeof buildTrackerDB> = {}
  fetch(chrome.runtime.getURL('disconnect-db.json'))
    .then(r => r.json())
    .then(raw => { db = buildTrackerDB(raw) })
    .catch(e => console.error('[Veil] Failed to load disconnect DB:', e))

  // 监听网络请求，识别追踪器（cast 绕过 @types/chrome 对非 blocking listener 的严格限制）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(chrome.webRequest.onBeforeRequest as any).addListener(
    (details: chrome.webRequest.WebRequestDetails) => {
      if (details.tabId < 0) return
      const match = matchTracker(details.url, db)
      if (!match) return

      const tabId = details.tabId
      if (!tabTrackers.has(tabId)) {
        tabTrackers.set(tabId, new Map())
      }
      const trackers = tabTrackers.get(tabId)!
      if (!trackers.has(match.company)) {
        trackers.set(match.company, match)
        broadcastScore(tabId)
      }
    },
    { urls: ['<all_urls>'] }
  )

  // Tab 导航时重置该 tab 状态
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return
    const tabId = details.tabId
    tabTrackers.delete(tabId)
    tabDarkPatternCount.delete(tabId)
    tabHiddenElementCount.delete(tabId)
    // 查询历史访问次数
    const url = details.url
    if (url && !url.startsWith('chrome://')) {
      try {
        const _domain = new URL(url).hostname // eslint-disable-line @typescript-eslint/no-unused-vars
        chrome.history.getVisits({ url })
          .then(visits => tabVisitCount.set(tabId, visits.length))
          .catch(() => tabVisitCount.set(tabId, 0))
      } catch {
        tabVisitCount.set(tabId, 0)
      }
    }
  })

  // Tab 关闭时清理
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabTrackers.delete(tabId)
    tabDarkPatternCount.delete(tabId)
    tabHiddenElementCount.delete(tabId)
    tabVisitCount.delete(tabId)
  })

  // 广播评分到侧边栏
  function broadcastScore(tabId: number) {
    const trackerCount = tabTrackers.get(tabId)?.size ?? 0
    const darkPatternCount = tabDarkPatternCount.get(tabId) ?? 0
    const hiddenElementCount = tabHiddenElementCount.get(tabId) ?? 0
    const visitCount = tabVisitCount.get(tabId) ?? 0

    const scoreData: ScoreData = {
      total: calculateScore({ darkPatternCount, trackerCount, hiddenElementCount, visitCount }),
      darkPatternCount,
      trackerCount,
      hiddenElementCount,
      visitCount,
    }

    const msg: VeilMessage = { type: 'SCORE_UPDATE', data: scoreData }
    chrome.runtime.sendMessage(msg).catch(() => { /* side panel not open */ })
  }

  // 响应消息
  chrome.runtime.onMessage.addListener((msg: VeilMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id

    // 打开 side panel（来自悬浮球点击）
    if ((msg as { type: string }).type === '_OPEN_PANEL') {
      chrome.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]?.id) {
          (chrome as unknown as { sidePanel: { open(opts: { tabId: number }): Promise<void> } })
            .sidePanel.open({ tabId: tabs[0].id }).catch(() => {})
        }
      })
      .catch(() => {})
      return
    }

    if (msg.type === 'GET_SCORE') {
      chrome.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
          const activeTabId = tabs[0]?.id
          if (activeTabId == null) {
            sendResponse({ type: 'SCORE_UPDATE', data: { total: 100, darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 } })
            return
          }
          const trackerCount = tabTrackers.get(activeTabId)?.size ?? 0
          const darkPatternCount = tabDarkPatternCount.get(activeTabId) ?? 0
          const hiddenElementCount = tabHiddenElementCount.get(activeTabId) ?? 0
          const visitCount = tabVisitCount.get(activeTabId) ?? 0
          const scoreData: ScoreData = {
            total: calculateScore({ darkPatternCount, trackerCount, hiddenElementCount, visitCount }),
            darkPatternCount, trackerCount, hiddenElementCount, visitCount,
          }
          sendResponse({ type: 'SCORE_UPDATE', data: scoreData })
        })
        .catch(() => sendResponse({ type: 'SCORE_UPDATE', data: { total: 100, darkPatternCount: 0, trackerCount: 0, hiddenElementCount: 0, visitCount: 0 } }))
      return true // async response
    }

    if (msg.type === 'GET_TRACKERS') {
      chrome.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
          const activeTabId = tabs[0]?.id
          const trackers: TrackerInfo[] = activeTabId
            ? [...(tabTrackers.get(activeTabId)?.values() ?? [])]
            : []
          sendResponse({ type: 'TRACKERS_RESPONSE', trackers })
        })
        .catch(() => sendResponse({ type: 'TRACKERS_RESPONSE', trackers: [] }))
      return true // async response
    }

    if (msg.type === 'DARK_PATTERNS_RESULT' && tabId != null) {
      tabDarkPatternCount.set(tabId, msg.patterns.length)
      broadcastScore(tabId)
    }

    if (msg.type === 'HIDDEN_ELEMENTS_RESULT' && tabId != null) {
      tabHiddenElementCount.set(tabId, msg.elements.length)
      broadcastScore(tabId)
    }

    if (msg.type === 'TRACKERS_UPDATE' && tabId != null) {
      const trackerMap = new Map<string, TrackerInfo>()
      for (const t of msg.trackers) {
        trackerMap.set(t.company, t)
      }
      tabTrackers.set(tabId, trackerMap)
      broadcastScore(tabId)
    }
  })
})
