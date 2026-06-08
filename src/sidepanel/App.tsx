import React, { useState, useEffect } from 'react'
import type { ScoreData, ViewName } from '../lib/types'
import Home from './views/Home'
import DarkPatterns from './views/DarkPatterns'
import TrackerMap from './views/TrackerMap'
import XRay from './views/XRay'
import Galaxy from './views/Galaxy'

const DEFAULT_SCORE: ScoreData = {
  total: 100,
  darkPatternCount: 0,
  trackerCount: 0,
  hiddenElementCount: 0,
  visitCount: 0,
}

export default function App() {
  const [view, setView] = useState<ViewName>('home')
  const [score, setScore] = useState<ScoreData>(DEFAULT_SCORE)

  useEffect(() => {
    // 请求当前评分
    chrome.runtime.sendMessage({ type: 'GET_SCORE' }, (res) => {
      if (res?.data) setScore(res.data)
    })

    // 监听实时更新
    const listener = (msg: { type: string; data?: ScoreData }) => {
      if (msg.type === 'SCORE_UPDATE' && msg.data) {
        setScore(msg.data)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const goHome = () => setView('home')

  const viewProps = { score, onBack: goHome }

  switch (view) {
    case 'darkpatterns': return <DarkPatterns {...viewProps} />
    case 'trackers': return <TrackerMap {...viewProps} />
    case 'xray': return <XRay {...viewProps} />
    case 'galaxy': return <Galaxy {...viewProps} />
    default: return <Home score={score} onNavigate={setView} />
  }
}
