import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initGlobalErrorListeners } from './lib/telemetry'

// Initialize client-side error and unhandled rejection listeners for telemetry
initGlobalErrorListeners()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
