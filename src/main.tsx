import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './globals.css'
import {
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  THEME_CSS_VAR_MAP,
} from './config/themes'
import { DISGUISE_STORAGE_KEY } from './config/disguise'

// Initialize theme from localStorage before render
try {
  const themeId = (localStorage.getItem(THEME_STORAGE_KEY) as keyof typeof THEMES) || DEFAULT_THEME_ID
  const colors = THEMES[themeId]?.colors || THEMES[DEFAULT_THEME_ID].colors
  const el = document.documentElement
  el.setAttribute('data-theme', themeId)
  for (const [k, varName] of Object.entries(THEME_CSS_VAR_MAP)) {
    if (colors[k as keyof typeof colors]) {
      el.style.setProperty(varName, colors[k as keyof typeof colors])
    }
  }
  let d = localStorage.getItem(DISGUISE_STORAGE_KEY)
  if (d === '1' || d === 'true') d = 'chat'
  if (d === 'chat' || d === 'claude' || d === 'gemini') {
    el.setAttribute('data-disguise', d)
  } else {
    el.removeAttribute('data-disguise')
  }
} catch {
  // ignore in non-browser env
}

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
}
