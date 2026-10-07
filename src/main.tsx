import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// MUST stay above the app import: it installs `ResizeObserver` for the legacy
// bundle, and `MyFrame`/`react-fast-marquee` throw on it during their first
// effect. See the file for why this is not `additionalLegacyPolyfills`.
import './polyfills/resizeObserver'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
