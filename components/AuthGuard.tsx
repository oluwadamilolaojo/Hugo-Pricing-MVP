'use client'
// components/AuthGuard.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // Show nothing while Firebase checks the session
  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-hugo-black flex items-center justify-center">
            <span className="font-serif text-hugo-yellow font-bold text-base">H</span>
          </div>
          <div className="text-[12px] text-hugo-muted">Loading…</div>
        </div>
      </div>
    )
  }

  // Not logged in — show nothing while redirect happens
  if (!user) return null

  // Logged in — render the page
  return <>{children}</>
}
