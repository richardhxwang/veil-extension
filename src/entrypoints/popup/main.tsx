import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

function Popup() {
  const [status, setStatus] = useState('⏳ 运行中…')

  useEffect(() => {
    setStatus('✅ popup 已加载')
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tabId = tabs[0]?.id
      setStatus(`✅ tabId = ${tabId}`)
      if (!tabId) { setStatus('❌ 没拿到 tabId'); return }
      try {
        await chrome.sidePanel.open({ tabId })
        setStatus('✅ sidePanel.open 成功，请看右侧')
      } catch (e: unknown) {
        setStatus(`❌ ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }, [])

  return (
    <div style={{ padding: 12, fontFamily: 'sans-serif', fontSize: 12, width: 220, lineHeight: 1.6 }}>
      <b>Veil 调试</b><br />
      {status}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Popup />)
