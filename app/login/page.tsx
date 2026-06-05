'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!loading && user) router.replace('/calculator') }, [user, loading, router])
  const handleGoogleSignIn = async () => {
    setSigningIn(true); setError('')
    try {
      const { signInWithPopup } = await import('firebase/auth')
      const { getFirebaseAuth, getGoogleProvider } = await import('@/lib/firebase')
      const result = await signInWithPopup(getFirebaseAuth(), getGoogleProvider())
      if (!result.user.email?.endsWith('@hugotech.co')) {
        const { getFirebaseAuth: a } = await import('@/lib/firebase')
        await a().signOut()
        setError('Access restricted to @hugotech.co accounts only.')
        setSigningIn(false); return
      }
      router.replace('/calculator')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user') setError('Sign-in failed. Please try again.')
      setSigningIn(false)
    }
  }
  if (loading) return null
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <h1 className="font-serif text-[42px] text-hugo-gold leading-tight text-center">hugo</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-hugo-black text-cream-100 px-3 py-1 rounded-full mt-2">internal pricing</span>
        </div>
        <div className="bg-cream-50 border border-cream-300 rounded-2xl p-8 shadow-sm">
          <h2 className="font-serif text-[22px] text-hugo-black mb-1">Sign in</h2>
          <p className="text-[12px] text-hugo-muted mb-7">Use your Hugo Google account to access the pricing calculator.</p>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5"><p className="text-[11px] text-red-600">{error}</p></div>}
          <button onClick={handleGoogleSignIn} disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-cream-300 rounded-xl px-4 py-3.5 text-[13px] font-medium text-hugo-black hover:bg-cream-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {signingIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
          <p className="text-[10px] text-hugo-muted text-center mt-5">Restricted to <span className="font-semibold">@hugotech.co</span> accounts only</p>
        </div>
      </div>
    </div>
  )
}
