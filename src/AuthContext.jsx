import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined)
    const [session, setSession] = useState(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            setUser(data.session?.user ?? null)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
            setSession(session)
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])

    const signInWithGoogle = () =>
        supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })

    const signOut = () => supabase.auth.signOut()

    return (
        <AuthContext.Provider value={{ user, session, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)