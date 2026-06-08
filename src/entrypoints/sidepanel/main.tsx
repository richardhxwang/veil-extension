import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../sidepanel/global.css'
import App from '../../sidepanel/App'

const root = document.getElementById('root')!
createRoot(root).render(<App />)
