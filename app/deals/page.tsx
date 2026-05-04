'use client'
// app/deals/page.tsx
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { getDeals, updateDealStatus, dealsToCSV, downloadCSV, checkOverdueDeals } from '@/lib/storage'
import { loadAssumptions } from '@/lib/assumptions'
import { fmt } from '@/lib/calculations'
import type { Deal, DealStatus } from '@/lib/types'

const STATUS_COLORS: Record<DealStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  overdue: 'bg-orange-100 text-orange-800',
}
const STATUS_LABELS: Record<DealStatus, string> = {
  draft: 'Draft', pending_review: 'Pending Review',
  approved: 'Approved', rejected: 'Rejected', overdue: 'Overdue',
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterGeo, setFilterGeo] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [reviewingDeal, setReviewingDeal] = useState<Deal | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null)

  useEffect(() => {
    const a = loadAssumptions()
    checkOverdueDeals(a.approvalWindowHours)
    setDeals(getDeals())
  }, [])

  const refresh = () => setDeals(getDeals())

  const filtered = deals.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterGeo !== 'all' && d.inputs.geography !== filterGeo) return false
    if (search) {
      const q = search.toLowerCase()
      if (!d.inputs.clientName.toLowerCase().includes(q) &&
          !d.inputs.salesperson.toLowerCase().includes(q) &&
          !d.id.includes(q)) return false
    }
    return true
  })

  const handleApprove = async (deal: Deal) => {
    updateDealStatus(deal.id, 'approved', reviewerName || 'Reviewer', reviewNotes)
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, type: 'approved', deal: { ...deal, reviewNotes }, submitterEmail: deal.inputs.salespersonEmail }),
      })
    } catch {}
    setReviewingDeal(null); setReviewNotes(''); refresh()
  }

  const handleReject = async (deal: Deal) => {
    if (!reviewNotes.trim()) { alert('Please provide a reason for rejection.'); return }
    updateDealStatus(deal.id, 'rejected', reviewerName || 'Reviewer', reviewNotes)
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, type: 'rejected', deal: { ...deal, reviewNotes }, submitterEmail: deal.inputs.salespersonEmail }),
      })
    } catch {}
    setReviewingDeal(null); setReviewNotes(''); refresh()
  }

  const exportSelected = () => {
    const toExport = selectedIds.size > 0 ? deals.filter(d => selectedIds.has(d.id)) : filtered
    downloadCSV(dealsToCSV(toExport), `hugo-deals-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(d => d.id)))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-700">Deal Log</h1>
            <p className="text-gray-500 text-sm">{deals.length} deals total · {deals.filter(d => d.status === 'pending_review').length} pending review</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportSelected} className="btn-secondary text-sm">
              ⬇ Export {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'all'} CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input className="input-field w-48" placeholder="Search client / salesperson…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input-field w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input-field w-40" value={filterGeo} onChange={e => setFilterGeo(e.target.value)}>
            <option value="all">All geographies</option>
            <option>Nigeria</option><option>South Africa</option><option>United States</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">No deals found</p>
              <p className="text-sm">Submit a deal from the Calculator to see it here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-3 py-3 w-8">
                      <input type="checkbox" className="rounded" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll} />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Client</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Salesperson</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Geography</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Service</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Floor Rate</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Proposed</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Floor GM</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Proposed GM</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Inv. Case</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Submitted</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((deal, i) => (
                    <>
                      <tr key={deal.id} className={`hover:bg-blue-50 transition-colors ${i%2===0?'bg-white':'bg-gray-50/50'}`}>
                        <td className="px-3 py-3">
                          <input type="checkbox" className="rounded" checked={selectedIds.has(deal.id)} onChange={() => toggleSelect(deal.id)} />
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)} className="font-medium text-navy-700 hover:underline text-left">
                            {deal.inputs.clientName || 'Unnamed'}
                          </button>
                          <p className="text-xs text-gray-400">{deal.id.slice(0,8)}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700">{deal.inputs.salesperson}</td>
                        <td className="px-3 py-3 text-sm text-gray-700">{deal.inputs.geography}</td>
                        <td className="px-3 py-3 text-sm text-gray-700">{deal.inputs.serviceType}</td>
                        <td className="px-3 py-3 text-right font-mono text-sm text-teal-700 font-medium">{fmt(deal.floorPL.floorRate)}</td>
                        <td className={`px-3 py-3 text-right font-mono text-sm font-medium ${deal.inputs.proposedRate < deal.floorPL.floorRate ? 'text-red-600' : 'text-navy-700'}`}>
                          {fmt(deal.inputs.proposedRate)}
                        </td>
                        <td className={`px-3 py-3 text-right font-mono text-sm ${deal.floorPL.investmentCaseRequired ? 'text-red-600' : 'text-green-700'}`}>
                          {fmt(deal.floorPL.grossMarginPct, 'pct')}
                        </td>
                        <td className={`px-3 py-3 text-right font-mono text-sm ${deal.proposedPL.investmentCaseRequired ? 'text-red-600' : 'text-green-700'}`}>
                          {fmt(deal.proposedPL.grossMarginPct, 'pct')}
                        </td>
                        <td className="px-3 py-3">
                          {deal.proposedPL.investmentCaseRequired
                            ? <span className="text-red-600 text-xs font-bold">⚠ Required</span>
                            : <span className="text-green-700 text-xs">✓ None</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`status-badge ${STATUS_COLORS[deal.status]}`}>{STATUS_LABELS[deal.status]}</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {new Date(deal.submittedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' })}
                        </td>
                        <td className="px-3 py-3">
                          {deal.status === 'pending_review' && (
                            <button onClick={() => { setReviewingDeal(deal); setReviewNotes(''); setReviewerName('') }}
                              className="btn-primary text-xs px-3 py-1">
                              Review
                            </button>
                          )}
                          {deal.status === 'overdue' && (
                            <button onClick={() => { setReviewingDeal(deal); setReviewNotes(''); setReviewerName('') }}
                              className="btn-danger text-xs px-3 py-1">
                              Overdue — Review
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {expandedDeal === deal.id && (
                        <tr key={`${deal.id}-expanded`}>
                          <td colSpan={13} className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="font-bold text-gray-600 mb-1">Deal Details</p>
                                <p>Division: {deal.inputs.division}</p>
                                <p>Commercial Model: {deal.inputs.commercialModel}</p>
                                <p>Complexity: {deal.inputs.complexityTier}</p>
                                <p>Duration: {deal.inputs.dealDuration} months</p>
                              </div>
                              <div>
                                <p className="font-bold text-gray-600 mb-1">Team</p>
                                <p>Agents: {deal.inputs.billableAgents} billable + {deal.inputs.agentBuffers} buffer</p>
                                <p>QAs: {deal.inputs.billableQAs} (ratio {deal.inputs.qaAgentRatio}:1)</p>
                                <p>TLs: {deal.inputs.billableTLs} (ratio {deal.inputs.tlAgentRatio}:1)</p>
                                <p>Shift: {deal.inputs.shiftType}</p>
                              </div>
                              <div>
                                <p className="font-bold text-gray-600 mb-1">Revenue (Proposed Rate)</p>
                                <p>Monthly: {fmt(deal.proposedPL.totalMonthlyRev, 'usd', 0)}</p>
                                <p>Annual: {fmt(deal.proposedPL.totalAnnualRev, 'usd', 0)}</p>
                                <p>Monthly GP: {fmt(deal.proposedPL.monthlyGP, 'usd', 0)}</p>
                                <p>Annual GP: {fmt(deal.proposedPL.annualGP, 'usd', 0)}</p>
                              </div>
                              <div>
                                <p className="font-bold text-gray-600 mb-1">Review</p>
                                {deal.reviewedBy && <p>Reviewed by: {deal.reviewedBy}</p>}
                                {deal.reviewedAt && <p>Reviewed: {new Date(deal.reviewedAt).toLocaleString()}</p>}
                                {deal.reviewNotes && <p>Notes: {deal.reviewNotes}</p>}
                                {deal.investmentCaseNotes && <p className="text-amber-700">Inv. case: {deal.investmentCaseNotes}</p>}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-navy-700 text-lg">Review Deal</h2>
              <p className="text-gray-500 text-sm">{reviewingDeal.inputs.clientName} · {reviewingDeal.inputs.geography} · {reviewingDeal.inputs.serviceType}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Floor Rate</p>
                  <p className="font-mono font-bold text-teal-700">{fmt(reviewingDeal.floorPL.floorRate)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Proposed Rate</p>
                  <p className={`font-mono font-bold ${reviewingDeal.proposedPL.investmentCaseRequired ? 'text-red-600' : 'text-navy-700'}`}>
                    {fmt(reviewingDeal.inputs.proposedRate)}
                  </p>
                </div>
                <div className={`rounded-lg p-3 text-center ${reviewingDeal.proposedPL.investmentCaseRequired ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-xs text-gray-500">Proposed GM</p>
                  <p className={`font-mono font-bold ${reviewingDeal.proposedPL.investmentCaseRequired ? 'text-red-600' : 'text-green-700'}`}>
                    {fmt(reviewingDeal.proposedPL.grossMarginPct,'pct')}
                  </p>
                </div>
              </div>

              {reviewingDeal.proposedPL.investmentCaseRequired && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-bold text-amber-700 text-sm">⚠ Investment Case</p>
                  <p className="text-amber-700 text-xs mt-1">{reviewingDeal.investmentCaseNotes || 'No justification provided.'}</p>
                </div>
              )}

              <div>
                <label className="label">Your name (reviewer)</label>
                <input className="input-field" value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className="label">Review notes {reviewingDeal.proposedPL.investmentCaseRequired ? '*' : '(optional)'}</label>
                <textarea className="input-field h-24 resize-none" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  placeholder={reviewingDeal.proposedPL.investmentCaseRequired ? "Required: reason for decision on this investment case" : "Any comments on this deal…"} />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={() => setReviewingDeal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleReject(reviewingDeal)} className="btn-danger flex-1">✗ Reject</button>
              <button onClick={() => handleApprove(reviewingDeal)} className="btn-success flex-1">✓ Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
