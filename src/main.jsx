import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="app-shell">
      <div className="app-grid">
        <div className="app-center">
          <AuthProvider>
            <App />
          </AuthProvider>
        </div>
      </div>
    </div>
  </StrictMode>,
)
