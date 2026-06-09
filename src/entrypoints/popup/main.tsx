import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

function Popup() {
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      try {
        await chrome.sidePanel.open({ tabId })
      } catch { /* ignore */ }
      window.close()
    })
  }, [])

  return (
    <div style={{ width: 180, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', fontSize: 13, color: '#8E8E93' }}>
      正在打开 Veil…
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Popup />)
