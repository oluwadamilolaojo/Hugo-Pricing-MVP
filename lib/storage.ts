// lib/storage.ts
// Deals → server-side Redis via API routes (shared across all users)
// Everything else (feedback, audit, draft) → localStorage (per-device, no sharing needed)

import type { Deal, DealStatus } from './types'

// ── DEALS — API-backed (Redis) ────────────────────────────────────────────────

export async function getDeals(): Promise<Deal[]> {
  try {
    const res = await fetch('/api/deals', { cache: 'no-store' })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    return data.deals ?? []
  } catch (err) {
    console.error('getDeals error:', err)
    return []
  }
}

export async function getDeal(id: string): Promise<Deal | null> {
  const deals = await getDeals()
  return deals.find(d => d.id === id) ?? null
}

export async function saveDeal(deal: Deal): Promise<void> {
  try {
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
  } catch (err) {
    console.error('saveDeal error:', err)
    throw err
  }
}

export async function updateDealStatus(
  id: string,
  status: DealStatus,
  reviewedBy?: string,
  reviewNotes?: string
): Promise<Deal | null> {
  try {
    const res = await fetch('/api/deals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, reviewedBy, reviewNotes }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    return data.deal ?? null
  } catch (err) {
    console.error('updateDealStatus error:', err)
    return null
  }
}

export async function deleteDeal(id: string): Promise<void> {
  try {
    const res = await fetch('/api/deals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
  } catch (err) {
    console.error('deleteDeal error:', err)
    throw err
  }
}

export async function checkOverdueDeals(windowHours: number): Promise<string[]> {
  const deals = await getDeals()
  const overdueIds: string[] = []
  const now = Date.now()
  for (const deal of deals) {
    if (deal.status === 'pending_review') {
      const submitted    = new Date(deal.submittedAt).getTime()
      const hoursElapsed = (now - submitted) / (1000 * 60 * 60)
      if (hoursElapsed > windowHours) {
        overdueIds.push(deal.id)
        await updateDealStatus(deal.id, 'overdue')
      }
    }
  }
  return overdueIds
}

// ── CSV / DOWNLOAD — unchanged ────────────────────────────────────────────────

export function dealsToCSV(deals: Deal[]): string {
  const headers = [
    'ID','Date','Salesperson','Client','Geography','Division','Commercial Model',
    'Service Type','Complexity','Agents','Floor Rate','Proposed Rate',
    'Floor GM%','Proposed GM%','Floor GM USD/hr','Proposed GM USD/hr',
    'Monthly Revenue (Proposed)','Annual Revenue (Proposed)',
    'Monthly GP (Proposed)','Investment Case Required','Status',
    'Submitted At','Reviewed By','Reviewed At','Review Notes'
  ]
  const rows = deals.map(d => [
    d.id, d.inputs.dateOfPricing, d.inputs.salesperson, d.inputs.clientName,
    d.inputs.geography, d.inputs.division, d.inputs.commercialModel,
    d.inputs.serviceType, d.inputs.complexityTier, d.inputs.billableAgents,
    d.floorPL.floorRate.toFixed(2), d.inputs.proposedRate.toFixed(2),
    (d.floorPL.grossMarginPct * 100).toFixed(1) + '%',
    (d.proposedPL.grossMarginPct * 100).toFixed(1) + '%',
    d.floorPL.grossMarginUSD.toFixed(2), d.proposedPL.grossMarginUSD.toFixed(2),
    d.proposedPL.totalMonthlyRev.toFixed(0), d.proposedPL.totalAnnualRev.toFixed(0),
    d.proposedPL.monthlyGP.toFixed(0),
    d.proposedPL.investmentCaseRequired ? 'Yes' : 'No',
    d.status, d.submittedAt, d.reviewedBy || '', d.reviewedAt || '', d.reviewNotes || ''
  ])
  return [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── FEEDBACK LOG — localStorage (per-device, no sharing needed) ───────────────
const FEEDBACK_KEY = 'hugo_feedback'

export interface FeedbackEntry {
  id: string
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  category: 'general' | 'bug' | 'calculation' | 'ux' | 'feature' | 'assumptions'
  feedback: string
  dealRef?: string
}

export function getFeedback(): FeedbackEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]') }
  catch { return [] }
}

export function saveFeedback(entry: FeedbackEntry): void {
  const all = getFeedback().filter(f => f.id !== entry.id)
  all.unshift(entry)
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all))
}

export function feedbackToCSV(entries: FeedbackEntry[]): string {
  const headers = ['ID', 'Submitted By', 'Email', 'Date', 'Category', 'Deal Ref', 'Feedback']
  const rows = entries.map(e => [
    e.id, e.submittedBy, e.submittedByEmail,
    new Date(e.submittedAt).toLocaleDateString('en-GB'),
    e.category, e.dealRef || '', e.feedback
  ])
  return [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

// ── AUDIT TRAIL — localStorage (admin-only, per-session) ─────────────────────
const AUDIT_KEY = 'hugo_audit'

export interface AuditEntry {
  id: string
  changedAt: string
  changedBy: string
  changedByEmail: string
  section: string
  field: string
  oldValue: string
  newValue: string
}

export function getAuditLog(): AuditEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]') }
  catch { return [] }
}

export function addAuditEntry(entry: AuditEntry): void {
  const log = getAuditLog()
  log.unshift(entry)
  localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 500)))
}

export function diffAssumptions(
  before: Record<string, unknown>,
  after:  Record<string, unknown>,
  prefix = ''
): Array<{ field: string; oldValue: string; newValue: string }> {
  const changes: Array<{ field: string; oldValue: string; newValue: string }> = []
  for (const key of Object.keys(after)) {
    const fullKey = prefix ? `${prefix} › ${key}` : key
    const bVal    = before[key]
    const aVal    = after[key]
    if (typeof aVal === 'object' && aVal !== null && !Array.isArray(aVal)) {
      changes.push(...diffAssumptions(
        (bVal as Record<string, unknown>) || {},
        aVal as Record<string, unknown>,
        fullKey
      ))
    } else if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      changes.push({ field: fullKey, oldValue: String(bVal ?? '—'), newValue: String(aVal ?? '—') })
    }
  }
  return changes
}
