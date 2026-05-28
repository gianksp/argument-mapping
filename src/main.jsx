import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './AuthContext.jsx'
import Router from './Router.jsx'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <Router />
  </AuthProvider>
)