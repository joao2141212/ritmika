import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { installGlobalTelemetry } from './lib/logger'

installGlobalTelemetry()

const chunkFailurePattern = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Expected a JavaScript-or-Wasm module script/i
const chunkReloadKey = 'ritmika:chunk-reload-at'

const recoverFromStaleChunk = (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason || '')
    if (!chunkFailurePattern.test(message)) return

    const lastReloadAt = Number(sessionStorage.getItem(chunkReloadKey) || 0)
    if (Date.now() - lastReloadAt < 60_000) return

    sessionStorage.setItem(chunkReloadKey, String(Date.now()))
    window.location.reload()
}

window.addEventListener('error', (event) => recoverFromStaleChunk(event.error || event.message))
window.addEventListener('unhandledrejection', (event) => recoverFromStaleChunk(event.reason))

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
