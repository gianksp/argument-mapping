import { useAuth } from '../AuthContext.jsx'

export default function AuthPage() {
    const { signInWithGoogle } = useAuth()

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm flex flex-col items-center gap-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-1">Argument Mapping</h1>
                    <p className="text-slate-400 text-sm">Sign in to create and manage your maps</p>
                </div>
                <button
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition font-medium"
                >
                    <GoogleIcon />
                    Continue with Google
                </button>
            </div>
        </div>
    )
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.7-2.9-11.9-7.2l-6.6 5.1C9.5 39.6 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.5-4.6 5.8l6.2 5.2C40.8 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
        </svg>
    )
}