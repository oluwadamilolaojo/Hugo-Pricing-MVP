'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { useAuth } from '@/lib/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import { getDeals, updateDealStatus, dealsToCSV, downloadCSV, checkOverdueDeals } from '@/lib/storage'
import { isReviewer } from '@/lib/roles'
import { loadAssumptions } from '@/lib/assumptions'
import { fmt } from '@/lib/calculations'
import type { Deal, DealStatus } from '@/lib/types'

const STATUS_CLASS: Record<DealStatus, string> = {
  draft: 'status-pending', pending_review: 'status-pending',
  approved: 'status-approved', rejected: 'status-rejected', overdue: 'status-overdue',
}
const STATUS_LABEL: Record<DealStatus, string> = {
  draft: 'Draft', pending_review: 'Pending review',
  approved: 'Approved', rejected: 'Rejected', overdue: 'Overdue',
}

export default function DealsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGeo, setFilterGeo] = useState('all')
  const [search, setSearch] = useState('')
  const [reviewingDeal, setReviewingDeal] = useState<Deal | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notifyError, setNotifyError] = useState('')

  const { user } = useAuth()
  const refresh = useCallback(() => setDeals(getDeals()), [])

  useEffect(() => {
    const a = loadAssumptions()
    checkOverdueDeals(a.approvalWindowHours)
    const allDeals = getDeals()
    setDeals(allDeals)

    // Fix 1: Auto-open review modal for deal specified in URL
    const targetId = searchParams.get('id')
    if (targetId) {
      const target = allDeals.find(d => d.id === targetId)
      if (target) {
        setExpandedId(targetId)
        if (target.status === 'pending_review' || target.status === 'overdue') {
          setReviewingDeal(target)
          setReviewNotes('')
          setReviewerName('')
        }
      }
      // Clear the ?id= from URL so refresh doesn't re-open
      router.replace('/deals', { scroll: false })
    }
  }, [searchParams, router])

  const handleApprove = async (deal: Deal) => {
    updateDealStatus(deal.id, 'approved', reviewerName || 'Reviewer', reviewNotes)
    try {
      await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id, type: 'approved',
          deal: { ...deal, reviewNotes, reviewedBy: reviewerName || 'Reviewer' },
          submitterEmail: deal.inputs.salespersonEmail,
        }),
      })
    } catch { setNotifyError('Approval saved but email notification failed.') }
    setReviewingDeal(null); setReviewNotes(''); refresh()
  }

  const handleReject = async (deal: Deal) => {
    if (!reviewNotes.trim()) { alert('Please provide a reason for rejection.'); return }
    updateDealStatus(deal.id, 'rejected', reviewerName || 'Reviewer', reviewNotes)
    try {
      await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id, type: 'rejected',
          deal: { ...deal, reviewNotes, reviewedBy: reviewerName || 'Reviewer' },
          submitterEmail: deal.inputs.salespersonEmail,
        }),
      })
    } catch { setNotifyError('Rejection saved but email notification failed.') }
    setReviewingDeal(null); setReviewNotes(''); refresh()
  }

  const exportDeals = () => {
    const toExport = selectedIds.size > 0 ? deals.filter(d => selectedIds.has(d.id)) : filtered
    downloadCSV(dealsToCSV(toExport), `hugo-deals-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const filtered = deals.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterGeo !== 'all' && d.inputs.geography !== filterGeo) return false
    if (search) {
      const q = search.toLowerCase()
      return d.inputs.clientName.toLowerCase().includes(q) ||
             d.inputs.salesperson.toLowerCase().includes(q) ||
             d.id.includes(q)
    }
    return true
  })

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () =>
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(d => d.id)))

  return (
    <AuthGuard>
    <div className="min-h-screen bg-cream-100">
      <Nav />

      {notifyError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-sm text-center py-2.5 flex items-center justify-center gap-3">
          {notifyError}
          <button onClick={() => setNotifyError('')} className="text-amber-500 hover:text-amber-700">✕</button>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-[32px] text-hugo-black leading-tight">Deal Log</h1>
            <p className="text-[12px] text-hugo-muted mt-1">
              {deals.length} deals · {deals.filter(d => d.status === 'pending_review').length} pending review
            </p>
          </div>
          <button onClick={exportDeals} className="btn-ghost">
            Export {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'all'} CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-cream-50 border border-cream-300 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
          <input className="hugo-input w-52" placeholder="Search client / salesperson…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="hugo-select w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="hugo-select w-44" value={filterGeo} onChange={e => setFilterGeo(e.target.value)}>
            <option value="all">All geographies</option>
            <option>Nigeria</option><option>South Africa</option><option>United States</option>
          </select>
          <span className="text-[11px] text-hugo-muted ml-auto">{filtered.length} results</span>
        </div>

        {/* Table */}
        <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="font-serif text-hugo-black text-xl mb-2">No deals found</div>
              <div className="text-[12px] text-hugo-muted">Submit a deal from the calculator to see it here.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: '860px' }}>
                <thead>
                  <tr className="border-b border-cream-300 bg-cream-100">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll} />
                    </th>
                    {['Client', 'Salesperson', 'Geography', 'Floor Rate', 'Proposed', 'Floor GM', 'Prop. GM', 'Inv. Case', 'Status', 'Submitted', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-hugo-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((deal, i) => (
                    <>
                      <tr key={deal.id} className={`deal-row ${i % 2 === 0 ? 'bg-cream-50' : 'bg-cream-100/50'}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.has(deal.id)} onChange={() => toggleSelect(deal.id)} />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setExpandedId(expandedId === deal.id ? null : deal.id)}
                            className="font-medium text-hugo-black hover:text-hugo-gold transition-colors text-sm text-left">
                            {deal.inputs.clientName || 'Unnamed'}
                          </button>
                          <div className="text-[10px] text-hugo-muted font-mono">{deal.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{deal.inputs.salesperson}</td>
                        <td className="px-4 py-3 text-sm text-hugo-muted">{deal.inputs.geography}</td>
                        <td className="px-4 py-3 text-sm font-serif font-semibold text-amber-700">{fmt(deal.floorPL.floorRate)}</td>
                        <td className={`px-4 py-3 text-sm font-serif font-semibold ${deal.inputs.proposedRate < deal.floorPL.floorRate ? 'text-red-600' : 'text-hugo-black'}`}>
                          {fmt(deal.inputs.proposedRate)}
                        </td>
                        <td className={`px-4 py-3 text-sm font-serif ${deal.floorPL.investmentCaseRequired ? 'text-red-600' : 'text-emerald-700'}`}>
                          {fmt(deal.floorPL.grossMarginPct, 'pct')}
                        </td>
                        <td className={`px-4 py-3 text-sm font-serif ${deal.proposedPL.investmentCaseRequired ? 'text-red-600' : 'text-emerald-700'}`}>
                          {fmt(deal.proposedPL.grossMarginPct, 'pct')}
                        </td>
                        <td className="px-4 py-3 text-[10px]">
                          {deal.proposedPL.investmentCaseRequired
                            ? <span className="font-bold text-red-500">Required</span>
                            : <span className="text-emerald-600">None</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={STATUS_CLASS[deal.status]}>{STATUS_LABEL[deal.status]}</span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-hugo-muted whitespace-nowrap">
                          {new Date(deal.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          {(deal.status === 'pending_review' || deal.status === 'overdue') && isReviewer(user?.email) && deal.inputs.salespersonEmail !== user?.email && (
                            <button onClick={() => { setReviewingDeal(deal); setReviewNotes(''); setReviewerName('') }}
                              className={`btn-ghost text-[11px] px-3 py-1 ${deal.status === 'overdue' ? 'border-orange-300 text-orange-600' : ''}`}>
                              Review
                            </button>
                          )}
                        </td>
                      </tr>

                      {expandedId === deal.id && (
                        <tr key={`${deal.id}-exp`}>
                          <td colSpan={12} className="px-6 py-4 bg-cream-200/60 border-b border-cream-300">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                              <div>
                                <div className="font-bold text-hugo-muted mb-1.5 text-[9px] uppercase tracking-widest">Deal details</div>
                                <div>Division: {deal.inputs.division}</div>
                                <div>Model: {deal.inputs.commercialModel.replace('Cost per ', '')}</div>
                                <div>Service: {deal.inputs.serviceType}</div>
                                <div>Duration: {deal.inputs.dealDuration} months</div>
                              </div>
                              <div>
                                <div className="font-bold text-hugo-muted mb-1.5 text-[9px] uppercase tracking-widest">Team</div>
                                <div>{deal.inputs.billableAgents} agents + {deal.inputs.agentBuffers} buffer</div>
                                <div>QAs: {deal.inputs.billableQAs} ({deal.inputs.qaAgentRatio}:1)</div>
                                <div>TLs: {deal.inputs.billableTLs} ({deal.inputs.tlAgentRatio}:1)</div>
                              </div>
                              <div>
                                <div className="font-bold text-hugo-muted mb-1.5 text-[9px] uppercase tracking-widest">Revenue (proposed)</div>
                                <div>Monthly: {fmt(deal.proposedPL.totalMonthlyRev, 'usd', 0)}</div>
                                <div>Annual: {fmt(deal.proposedPL.totalAnnualRev, 'usd', 0)}</div>
                                <div>Monthly GP: {fmt(deal.proposedPL.monthlyGP, 'usd', 0)}</div>
                              </div>
                              <div>
                                <div className="font-bold text-hugo-muted mb-1.5 text-[9px] uppercase tracking-widest">Review info</div>
                                {deal.reviewedBy && <div>By: {deal.reviewedBy}</div>}
                                {deal.reviewNotes && <div>Notes: {deal.reviewNotes}</div>}
                                {deal.investmentCaseNotes && <div className="text-amber-700">Inv: {deal.investmentCaseNotes}</div>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review modal */}
      {reviewingDeal && (
        <div className="fixed inset-0 bg-hugo-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-cream-300">
              <h2 className="font-serif text-[22px] text-hugo-black">Review Deal</h2>
              <p className="text-[12px] text-hugo-muted mt-0.5">
                {reviewingDeal.inputs.clientName} · {reviewingDeal.inputs.geography} · {reviewingDeal.inputs.serviceType}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Floor Rate', val: fmt(reviewingDeal.floorPL.floorRate), cls: 'text-amber-700' },
                  { label: 'Proposed Rate', val: fmt(reviewingDeal.inputs.proposedRate), cls: reviewingDeal.proposedPL.investmentCaseRequired ? 'text-red-600' : 'text-hugo-black' },
                  { label: 'Gross Margin', val: fmt(reviewingDeal.proposedPL.grossMarginPct, 'pct'), cls: reviewingDeal.proposedPL.investmentCaseRequired ? 'text-red-600' : 'text-emerald-700' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="bg-cream-100 border border-cream-300 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-hugo-muted mb-1">{label}</div>
                    <div className={`font-serif text-[18px] font-semibold ${cls}`}>{val}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-cream-100 border border-cream-200 rounded-lg p-2.5">
                  <div className="text-hugo-muted mb-0.5">Monthly revenue</div>
                  <div className="font-serif font-semibold text-hugo-black text-sm">{fmt(reviewingDeal.proposedPL.totalMonthlyRev, 'usd', 0)}</div>
                </div>
                <div className="bg-cream-100 border border-cream-200 rounded-lg p-2.5">
                  <div className="text-hugo-muted mb-0.5">Monthly gross profit</div>
                  <div className={`font-serif font-semibold text-sm ${reviewingDeal.proposedPL.monthlyGP > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmt(reviewingDeal.proposedPL.monthlyGP, 'usd', 0)}
                  </div>
                </div>
              </div>
              {reviewingDeal.investmentCaseNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Investment Case Justification</div>
                  <div className="text-[11px] text-amber-700 leading-relaxed">{reviewingDeal.investmentCaseNotes}</div>
                </div>
              )}
              <div>
                <div className="field-label">Your name</div>
                <input className="hugo-input" value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <div className="field-label">Review notes {reviewingDeal.proposedPL.investmentCaseRequired ? '*' : '(optional)'}</div>
                <textarea rows={3} className="hugo-input resize-none" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  placeholder={reviewingDeal.proposedPL.investmentCaseRequired ? 'Required: reason for your decision' : 'Any comments…'} />
              </div>
            </div>
            <div className="p-6 border-t border-cream-300 flex gap-3">
              <button onClick={() => setReviewingDeal(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleReject(reviewingDeal)} className="btn-danger flex-1">Reject</button>
              <button onClick={() => handleApprove(reviewingDeal)} className="btn-success flex-1">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AuthGuard>
  )
}
