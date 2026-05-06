'use client'
// components/AuthGuard.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { isAdmin } from '@/lib/roles'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="font-serif text-[28px] text-hugo-gold">hugo</span>
          <div className="text-[12px] text-hugo-muted">Loading…</div>
        </div>
      </div>
    )
  }

  if (!user) return null
  return <>{children}</>
}

// AdminGuard — only allows users in NEXT_PUBLIC_ADMIN_EMAILS
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !isAdmin(user.email))) {
      router.replace('/calculator')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="font-serif text-[28px] text-hugo-gold">hugo</span>
          <div className="text-[12px] text-hugo-muted">Loading…</div>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin(user.email)) return null
  return <>{children}</>
}
