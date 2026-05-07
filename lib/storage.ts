// lib/storage.ts
import type { Deal, DealStatus } from './types'

const DEALS_KEY = 'hugo_deals'

export function getDeals(): Deal[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(DEALS_KEY) || '[]')
  } catch { return [] }
}

export function getDeal(id: string): Deal | null {
  return getDeals().find(d => d.id === id) ?? null
}

export function saveDeal(deal: Deal): void {
  const deals = getDeals().filter(d => d.id !== deal.id)
  deals.unshift({ ...deal, updatedAt: new Date().toISOString() })
  localStorage.setItem(DEALS_KEY, JSON.stringify(deals))
}

export function deleteDeal(id: string): void {
  const deals = getDeals().filter(d => d.id !== id)
  localStorage.setItem(DEALS_KEY, JSON.stringify(deals))
}

export function updateDealStatus(id: string, status: DealStatus, reviewedBy?: string, reviewNotes?: string): Deal | null {
  const deal = getDeal(id)
  if (!deal) return null
  const updated: Deal = {
    ...deal,
    status,
    ...(reviewedBy ? { reviewedBy, reviewedAt: new Date().toISOString() } : {}),
    ...(reviewNotes !== undefined ? { reviewNotes } : {}),
    updatedAt: new Date().toISOString(),
  }
  saveDeal(updated)
  return updated
}

export function checkOverdueDeals(windowHours: number): string[] {
  const deals = getDeals()
  const overdueIds: string[] = []
  const now = Date.now()
  for (const deal of deals) {
    if (deal.status === 'pending_review') {
      const submitted = new Date(deal.submittedAt).getTime()
      const hoursElapsed = (now - submitted) / (1000 * 60 * 60)
      if (hoursElapsed > windowHours) {
        overdueIds.push(deal.id)
        updateDealStatus(deal.id, 'overdue')
      }
    }
  }
  return overdueIds
}

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
  return [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
// ── FEEDBACK LOG ─────────────────────────────────────────────────────────────
const FEEDBACK_KEY = 'hugo_feedback'

export interface FeedbackEntry {
  id: string
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  category: 'general' | 'bug' | 'calculation' | 'ux' | 'feature'
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
