'use client'
// components/Nav.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Nav() {
  const path = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        path === href ? 'bg-navy-700 text-white' : 'text-navy-100 hover:bg-navy-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-navy-600 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-navy-600 font-bold text-xs">H</span>
            </div>
            <span className="text-white font-semibold text-sm">Hugo Pricing Calculator</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLink('/calculator', '📊 Calculator')}
            {navLink('/deals', '📁 Deal Log')}

            {/* Settings dropdown */}
            <div className="relative">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="px-4 py-2 text-sm font-medium rounded-md text-navy-100 hover:bg-navy-700 hover:text-white transition-colors flex items-center gap-1"
              >
                ⚙ Settings
                <svg className={`w-3 h-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <Link
                    href="/settings"
                    onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    🔧 Assumptions
                  </Link>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 rounded-b-lg w-full text-left"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {settingsOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
      )}
    </nav>
  )
}
