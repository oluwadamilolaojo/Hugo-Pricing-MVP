// app/api/deals/route.ts
// Redis-backed deal storage — replaces localStorage
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import type { Deal, DealStatus } from '@/lib/types'

const DEALS_KEY = 'hugo:deals'

// Initialise Redis — returns null if env vars are not set
function getRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// ── GET — fetch all deals ─────────────────────────────────────────────────────
export async function GET() {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured', deals: [] },
      { status: 503 }
    )
  }
  try {
    const deals = await redis.get<Deal[]>(DEALS_KEY)
    return NextResponse.json({ deals: deals ?? [] })
  } catch (err) {
    console.error('Redis GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch deals', deals: [] }, { status: 500 })
  }
}

// ── POST — save a new deal ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }
  try {
    const { deal }: { deal: Deal } = await req.json()
    if (!deal?.id) {
      return NextResponse.json({ error: 'Invalid deal payload' }, { status: 400 })
    }
    // Read existing, prepend new deal, write back
    const existing = (await redis.get<Deal[]>(DEALS_KEY)) ?? []
    const updated  = [
      { ...deal, updatedAt: new Date().toISOString() },
      ...existing.filter(d => d.id !== deal.id),
    ]
    await redis.set(DEALS_KEY, updated)
    return NextResponse.json({ ok: true, deal })
  } catch (err) {
    console.error('Redis POST error:', err)
    return NextResponse.json({ error: 'Failed to save deal' }, { status: 500 })
  }
}

// ── PATCH — update deal status (approve / reject / overdue) ──────────────────
export async function PATCH(req: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }
  try {
    const {
      id, status, reviewedBy, reviewNotes
    }: { id: string; status: DealStatus; reviewedBy?: string; reviewNotes?: string } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    const existing = (await redis.get<Deal[]>(DEALS_KEY)) ?? []
    const deal = existing.find(d => d.id === id)
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const updated: Deal = {
      ...deal,
      status,
      ...(reviewedBy ? { reviewedBy, reviewedAt: new Date().toISOString() } : {}),
      ...(reviewNotes !== undefined ? { reviewNotes } : {}),
      updatedAt: new Date().toISOString(),
    }
    const updatedDeals = existing.map(d => d.id === id ? updated : d)
    await redis.set(DEALS_KEY, updatedDeals)
    return NextResponse.json({ ok: true, deal: updated })
  } catch (err) {
    console.error('Redis PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

// ── DELETE — admin only ───────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }
  try {
    const { id }: { id: string } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const existing = (await redis.get<Deal[]>(DEALS_KEY)) ?? []
    const updated  = existing.filter(d => d.id !== id)
    await redis.set(DEALS_KEY, updated)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Redis DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
