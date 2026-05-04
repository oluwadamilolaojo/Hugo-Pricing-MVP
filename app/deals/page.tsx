import { Suspense } from 'react'
import DealsClient from './DealsClient'

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="font-serif text-hugo-black text-xl">Loading…</div>
      </div>
    }>
      <DealsClient />
    </Suspense>
  )
}
