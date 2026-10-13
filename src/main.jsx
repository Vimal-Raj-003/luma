import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider, SsoCallback } from './auth.jsx'
import { syncCatalog } from './catalog.js'
import './styles.css'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const isAdminRoute = /^\/admin(\/|$)/.test(window.location.pathname)

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

const root = createRoot(document.getElementById('root'))
if (window.location.pathname === '/sso-callback') {
  // Google has just sent the customer back: finish signing in, then return to the page they started on
  root.render(<AuthProvider><SsoCallback /></AuthProvider>)
} else if (isAdminRoute) {
  // the Super Admin area: its own screen, loaded only here (the customer site never downloads it)
  document.getElementById('boot')?.remove()
  document.title = 'LUMA Super Admin'
  root.render(<AuthProvider><Suspense fallback={null}><AdminApp /></Suspense></AuthProvider>)
} else {
  syncCatalog().finally(() => root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  ))
}
