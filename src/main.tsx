import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider, applyTheme, readStoredChoice, resolveMode } from './theme/ThemeProvider'
import './index.css'
import { isLegacy } from './marketplace/registry'

// Development only: the marketplace data is validated at load; the build script already refuses a source that breaks an invariant.
if (import.meta.env.DEV && !isLegacy) {
  void Promise.all([import('./marketplace/import'), import('./marketplace/validate')]).then(([data, check]) => {
    const issues = check.validateMarketplace({ base: data.CATALOGUE, ops: data.OPERATIONS }).filter(i => i.level === 'error')
    if (issues.length) console.warn(`Marketplace data: ${issues.length} validation errors`, issues.slice(0, 5))
  })
}

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
