import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'
import { initializeElectronAPIShim } from './utils/electronAPIShim'
import { initializeReactGlobals } from './utils/reactUtils'
import { initializeCapacitor } from './capacitor-init'

// Initialize web shim so components can safely call window.electronAPI in browser
initializeElectronAPIShim()

// Ensure React is properly available globally to prevent useLayoutEffect errors
initializeReactGlobals()

// Initialize Capacitor for mobile platforms
initializeCapacitor().catch(console.error)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)