import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hugo · Pricing Calculator',
  description: 'Internal pricing and margin calculator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
