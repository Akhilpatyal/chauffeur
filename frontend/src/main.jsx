import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureAttribution } from './lib/api'
import { startVisitTracking } from './lib/analytics'
import { warmContentCache } from './lib/content'

/*
 * Recorded before the app renders, because the campaign parameters are on the
 * landing URL and are gone by the time someone reaches a form three pages later.
 * First touch wins.
 */
captureAttribution()

/*
 * Reports how long the last page was read when the tab is hidden. Registered
 * here rather than in a component so it survives every route change, and
 * before render so the listener exists even if the first page throws.
 */
startVisitTracking()

/*
 * Fills the content cache while the browser is idle, so opening a listing
 * page shows live content in its first paint instead of the deployed
 * snapshot. See lib/content.js for why it is not swapped in mid-view.
 */
warmContentCache()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
