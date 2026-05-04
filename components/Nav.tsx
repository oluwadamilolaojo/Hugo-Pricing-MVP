'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Nav() {
  const path = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isActive = (href: string) => path === href || path.startsWith(href + '/')

  return (
    <nav className="bg-cream-100 border-b border-cream-300 sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-hugo-black flex items-center justify-center">
              <span className="font-serif text-hugo-yellow font-bold text-sm">H</span>
            </div>
            <span className="font-sans font-medium text-hugo-black tracking-tight">hugo</span>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-hugo-black text-cream-100 px-2 py-0.5 rounded-full">
              internal pricing
            </span>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-1">
            {[
              { href: '/calculator', label: 'Calculator' },
              { href: '/deals',      label: 'Deal Log' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-chip text-[12px] font-medium transition-all ${
                  isActive(href)
                    ? 'bg-hugo-black text-cream-100'
                    : 'text-hugo-muted hover:text-hugo-black hover:bg-cream-200'
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="relative ml-1">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`px-4 py-2 rounded-chip text-[12px] font-medium transition-all flex items-center gap-1 ${
                  isActive('/settings')
                    ? 'bg-hugo-black text-cream-100'
                    : 'text-hugo-muted hover:text-hugo-black hover:bg-cream-200'
                }`}
              >
                Settings
                <svg className={`w-3 h-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-cream-50 border border-cream-300 rounded-xl shadow-lg z-50 overflow-hidden">
                  <Link href="/settings" onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[12px] text-hugo-black hover:bg-cream-200 transition-colors">
                    Assumptions
                  </Link>
                  <div className="border-t border-cream-300" />
                  <button onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[12px] text-hugo-muted hover:bg-cream-200 transition-colors w-full text-left">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setSettingsOpen(false)} />
      )}
    </nav>
  )
}
