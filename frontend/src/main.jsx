import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { AppErrorBoundary } from './components/crm/AppErrorBoundary'
import { NotificationProvider } from './components/crm/Notifications'
import ThemeProvider from './utils/ThemeContext'
import App from './App'
import { clearSession, getStoredSession, isValidSession } from './services/api'
import { captureSsoTokenFromUrl } from './features/auth/useSsoBootstrap'
import './styles/globals.css'
import './styles/login-ag-background.css'

captureSsoTokenFromUrl()

const stored = getStoredSession()
if (!isValidSession(stored)) {
  clearSession()
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('No se encontro el contenedor #root')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Router>
        <ThemeProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </ThemeProvider>
      </Router>
    </AppErrorBoundary>
  </React.StrictMode>,
)
