import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from './components/AuthGate'
import './styles/pwa.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/dashboard.css'
import './styles/tasks.css'
import './styles/calendar.css'
import './styles/statistics.css'
createRoot(document.getElementById('root')).render(<StrictMode><AuthGate /></StrictMode>)

import './styles/readability.css'
import './styles/academic.css'
