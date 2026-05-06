'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { isAdmin } from '@/lib/roles'
import Image from 'next/image'

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isActive = (href: string) => path === href || path.startsWith(href + '/')

  const handleSignOut = async () => {
    setSettingsOpen(false)
    await signOut()
    router.replace('/login')
  }

  return (
    <nav className="bg-cream-100 border-b border-cream-300 sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo — no black square, just hugo in gold */}
          <div className="flex items-center gap-3">
            <span className="font-serif text-[20px] text-hugo-gold tracking-tight">hugo</span>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-hugo-black text-cream-100 px-2 py-0.5 rounded-full">
              internal pricing
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {[
              { href: '/calculator', label: 'Calculator' },
              { href: '/deals',      label: 'Deal Log' },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className={`px-4 py-2 rounded-chip text-[12px] font-medium transition-all ${
                  isActive(href) ? 'bg-hugo-black text-cream-100' : 'text-hugo-muted hover:text-hugo-black hover:bg-cream-200'
                }`}>
                {label}
              </Link>
            ))}

            {/* Account dropdown */}
            <div className="relative ml-1">
              <button onClick={() => setSettingsOpen(!settingsOpen)}
                className={`px-3 py-2 rounded-chip text-[12px] font-medium transition-all flex items-center gap-2 ${
                  isActive('/settings') ? 'bg-hugo-black text-cream-100' : 'text-hugo-muted hover:text-hugo-black hover:bg-cream-200'
                }`}>
                {user?.photoURL ? (
                  <Image src={user.photoURL} alt={user.displayName ?? 'User'} width={22} height={22} className="rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-hugo-black flex items-center justify-center">
                    <span className="text-[9px] font-bold text-cream-100">{user?.displayName?.[0] ?? 'U'}</span>
                  </div>
                )}
                <span className="hidden sm:block max-w-[100px] truncate">
                  {user?.displayName?.split(' ')[0] ?? 'Account'}
                </span>
                <svg className={`w-3 h-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-cream-50 border border-cream-300 rounded-xl shadow-lg z-50 overflow-hidden">

                  {/* User info */}
                  {user && (
                    <div className="px-4 py-3 border-b border-cream-300">
                      <p className="text-[12px] font-semibold text-hugo-black truncate">{user.displayName}</p>
                      <p className="text-[10px] text-hugo-muted truncate">{user.email}</p>
                      {isAdmin(user.email) && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-hugo-gold">Admin</span>
                      )}
                    </div>
                  )}

                  {/* Assumptions — only visible to admins */}
                  {isAdmin(user?.email) && (
                    <Link href="/settings" onClick={() => setSettingsOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-[12px] text-hugo-black hover:bg-cream-200 transition-colors">
                      Assumptions
                    </Link>
                  )}

                  <div className="border-t border-cream-300" />
                  <button onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-3 text-[12px] text-red-500 hover:bg-red-50 transition-colors w-full text-left">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {settingsOpen && <div className="fixed inset-0 z-30" onClick={() => setSettingsOpen(false)} />}
    </nav>
  )
}
