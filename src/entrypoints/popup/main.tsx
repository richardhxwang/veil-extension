import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

function Popup() {
  const [error, setError] = useState('')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) { setError('无法获取当前标签页'); return }
      try {
        await chrome.sidePanel.open({ tabId })
        window.close()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }, [])

  return (
    <div style={{ padding: 12, fontFamily: 'sans-serif', fontSize: 13, width: 200 }}>
      {error ? `❌ ${error}` : '正在打开 Veil 侧边栏…'}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Popup />)
