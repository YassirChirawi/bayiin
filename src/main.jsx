import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initErrorLogging } from './lib/errorLog'
import { initNative } from './lib/native'

// BAY-108 : capture les erreurs non catchées + promesses rejetées → collection error_logs.
initErrorLogging()

// Réglages natifs (StatusBar/Splash/Keyboard/retour Android) — no-op sur le web.
initNative()

// Automatically unregister any stale Service Workers in development mode
// This prevents the MIME type "text/html" error when Vite dev server serves index.html as a fallback for missing production JS chunks.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <App />
)
