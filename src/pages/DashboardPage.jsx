import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { supabase } from '../supabase.js'

export default function DashboardPage() {
    const { user, signOut } = useAuth()
    const [maps, setMaps] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase
            .from('maps')
            .select('id, title, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .then(({ data }) => { setMaps(data || []); setLoading(false) })
    }, [user.id])

    const deleteMap = async (id) => {
        if (!confirm('Delete this map?')) return
        await supabase.from('maps').delete().eq('id', id)
        setMaps(m => m.filter(x => x.id !== id))
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
                <span className="text-lg font-semibold">Argument Mapping</span>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">{user.email}</span>
                    <button onClick={signOut} className="text-sm text-slate-500 hover:text-slate-800">Sign out</button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Your maps</h2>
                    <button
                        onClick={() => location.href = '/new'}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-700"
                    >
                        + New map
                    </button>
                </div>

                {loading && <p className="text-slate-400">Loading…</p>}
                {!loading && maps.length === 0 && (
                    <p className="text-slate-400">No maps yet. Create your first one!</p>
                )}

                <div className="flex flex-col gap-3">
                    {maps.map(map => (
                        <div
                            key={map.id}
                            className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
                            onClick={() => location.href = `/map/${map.id}`}
                        >
                            <div>
                                <p className="font-medium">{map.title || 'Untitled'}</p>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    {new Date(map.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    className="text-sm text-slate-400 hover:text-slate-600"
                                    onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/map/${map.id}`) }}
                                >
                                    Copy link
                                </button>
                                <button
                                    className="text-sm text-red-400 hover:text-red-600"
                                    onClick={e => { e.stopPropagation(); deleteMap(map.id) }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}