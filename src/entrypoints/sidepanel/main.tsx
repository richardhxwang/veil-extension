import React from 'react'
import ReactDOM from 'react-dom/client'
import '../../sidepanel/global.css'

function App() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Veil</h1>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
