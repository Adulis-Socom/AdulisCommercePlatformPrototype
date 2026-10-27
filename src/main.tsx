import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider, applyTheme, readStoredChoice, resolveMode } from './theme/ThemeProvider'
import './index.css'

// The stored Theme Lab choice applies before the first paint, so a refresh never flashes the Baseline.
const stored = readStoredChoice()
applyTheme(stored.palette, resolveMode(stored.mode))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
