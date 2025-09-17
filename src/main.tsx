import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if (import.meta.env.DEV) {
  const ReactNS = await import('react')
  if (!ReactNS || typeof ReactNS.useState !== 'function' || typeof ReactNS.useEffect !== 'function') {
    console.error('[React sanity check] Invalid React import:', ReactNS)
    throw new Error('React is not resolving correctly (hooks missing). Check duplicate React or Vite alias/external.')
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

