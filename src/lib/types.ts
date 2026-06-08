export interface DarkPattern {
  type: string           // '虚假倒计时' | '预勾选订阅' | '羞辱式按钮' | '隐藏取消按钮'
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
