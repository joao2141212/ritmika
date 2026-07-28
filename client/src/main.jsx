import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { installGlobalTelemetry } from './lib/logger'

installGlobalTelemetry()

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
