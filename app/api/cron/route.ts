import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import type { Deal } from '@/lib/types'

const DEALS_KEY = 'hugo:deals'

export async function GET(req: Request) {
  // Verify this is actually Vercel calling, not a random request
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const deals = (await redis.get<Deal[]>(DEALS_KEY)) ?? []
  const windowHours = 24 // change this to match your approval window
  const now = Date.now()
  const overdueIds: string[] = []

  const updated = deals.map(deal => {
    if (deal.status === 'pending_review') {
      const hoursElapsed = (now - new Date(deal.submittedAt).getTime()) / (1000 * 60 * 60)
      if (hoursElapsed > windowHours) {
        overdueIds.push(deal.id)
        return { ...deal, status: 'overdue' as const, updatedAt: new Date().toISOString() }
      }
    }
    return deal
  })

  if (overdueIds.length > 0) {
    await redis.set(DEALS_KEY, updated)
    // Fire overdue emails
    for (const id of overdueIds) {
      const deal = updated.find(d => d.id === id)
      if (deal) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dealId: id, type: 'overdue', deal,
            approverEmail: process.env.APPROVER_EMAIL,
          }),
        })
      }
    }
  }

  return NextResponse.json({ checked: deals.length, overdue: overdueIds.length })
}
