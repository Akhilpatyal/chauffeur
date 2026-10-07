import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureAttribution } from './lib/api'

/*
 * Recorded before the app renders, because the campaign parameters are on the
 * landing URL and are gone by the time someone reaches a form three pages later.
 * First touch wins.
 */
captureAttribution()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
