// app/api/deals/route.ts
import { NextRequest, NextResponse } from 'next/server'

// This API route is a stub for upgrading to server-side storage.
// Currently data lives in localStorage (client-side).
// To upgrade to shared storage:
//   1. Install @upstash/redis: npm install @upstash/redis
//   2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env
//   3. Replace the localStorage calls in lib/storage.ts with Redis calls

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Server-side storage not yet configured. Data lives in localStorage.' })
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: 'Server-side storage not yet configured.' })
}
