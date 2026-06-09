export interface DarkPattern {
  type: string
  element: string        // CSS 选择器
  description: string
}

export interface TrackerInfo {
  company: string
  category: string
  domain: string
}

export interface HiddenElement {
  selector: string
  reason: string         // 'hidden-input' | 'hidden-terms' | 'tracking-pixel'
  contentPreview: string
  tagName: string
  fieldName?: string     // for hidden inputs
  fieldValue?: string    // for hidden inputs
  riskLevel?: 'high' | 'medium'
}

export interface ScoreInput {
  darkPatternCount: number
  trackerCount: number
  hiddenElementCount: number
  visitCount: number
}

export interface ScoreData {
  total: number
  darkPatternCount: number
  trackerCount: number
  hiddenElementCount: number
  visitCount: number
}

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
  | { type: 'GET_TRACKERS' }
  | { type: 'TRACKERS_RESPONSE'; trackers: TrackerInfo[] }

export type ViewName = 'home' | 'darkpatterns' | 'trackers' | 'xray' | 'galaxy'
