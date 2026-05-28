import { useAuth } from './AuthContext.jsx'
import AuthPage from './pages/AuthPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import App from './App.jsx'

function getRoute() {
    const path = location.pathname
    const m = path.match(/\/map\/([a-f0-9-]{36})/)
    if (m) return { page: 'map', id: m[1] }
    if (path === '/new') return { page: 'new' }
    return { page: 'home' }
}

export default function Router() {
    const { user } = useAuth()
    const route = getRoute()

    if (user === undefined) {
        return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>
    }

    if (route.page === 'map') {
        return <App mapId={route.id} />
    }

    if (!user) return <AuthPage />

    if (route.page === 'new') return <App mapId={null} />

    return <DashboardPage />
}