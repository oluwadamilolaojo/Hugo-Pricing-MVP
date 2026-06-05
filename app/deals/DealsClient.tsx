'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import PLPanel from '@/components/PLPanel'
import { getDeals, updateDealStatus, dealsToCSV, downloadCSV, checkOverdueDeals } from '@/lib/storage'
import { loadAssumptions } from '@/lib/assumptions'
import { fmt } from '@/lib/calculations'
import { useAuth } from '@/lib/AuthContext'
import { isReviewer } from '@/lib/roles'
import type { Deal, DealStatus } from '@/lib/types'

const STATUS_CLASS: Record<DealStatus, string> = {
  draft: 'status-pending', pending_review: 'status-pending',
  approved: 'status-approved', rejected: 'status-rejected', overdue: 'status-overdue',
}
const STATUS_LABEL: Record<DealStatus, string> = {
  draft: 'Draft', pending_review: 'Pending review',
  approved: 'Approved', rejected: 'Rejected', overdue: 'Overdue',
}

type SortKey = 'submittedAt' | 'clientName' | 'geography' | 'floorRate' | 'proposedRate' | 'proposedGM' | 'status'
type SortDir = 'asc' | 'desc'

// ── FULL DEAL MODAL ────────────────────────────────────────────────────────────
function DealModal({ deal, mode, reviewNotes, reviewerName, onReviewNotesChange, onReviewerNameChange, onApprove, onReject, onClose }: {
  deal: Deal; mode: 'review' | 'view'
  reviewNotes: string; reviewerName: string
  onReviewNotesChange: (v: string) => void
  onReviewerNameChange: (v: string) => void
  onApprove: () => void; onReject: () => void; onClose: () => void
}) {
  const isInv = deal.proposedPL.investmentCaseRequired
  const isBelowFloor = !isInv && deal.inputs.proposedRate < deal.floorPL.floorRate

  return (
    <div className="fixed inset-0 bg-hugo-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-2xl w-full max-w-6xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300 bg-cream-100 rounded-t-2xl">
          <div>
            <h2 className="font-serif text-[22px] text-hugo-black">{mode === 'review' ? 'Review Deal' : 'Deal Details'}</h2>
            <p className="text-[12px] text-hugo-muted mt-0.5">{deal.inputs.clientName} · {deal.inputs.geography} · {deal.inputs.serviceType}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${isInv ? 'bg-red-100 text-red-700' : isBelowFloor ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isInv ? 'Investment case required' : isBelowFloor ? 'Below floor rate — discuss' : 'Within parameters'}
            </span>
            <button onClick={onClose} className="text-hugo-muted hover:text-hugo-black text-xl px-2">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Salesperson',   val: deal.inputs.salesperson },
              { label: 'Date',          val: new Date(deal.inputs.dateOfPricing).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
              { label: 'Division',      val: deal.inputs.division },
              { label: 'Complexity',    val: deal.inputs.complexityTier },
              { label: 'Agents',        val: `${deal.inputs.billableAgents} billable + ${deal.inputs.agentBuffers} buffer` },
              { label: 'QA / TL',       val: `${deal.inputs.billableQAs} QA (${deal.inputs.qaAgentRatio}:1) · ${deal.inputs.billableTLs} TL (${deal.inputs.tlAgentRatio}:1)` },
              { label: 'Duration',      val: `${deal.inputs.dealDuration} months` },
              { label: 'Shift',         val: deal.inputs.shiftType },
            ].map(({ label, val }) => (
              <div key={label} className="bg-cream-100 border border-cream-200 rounded-xl p-3">
                <div className="text-[10px] text-hugo-muted mb-0.5 uppercase tracking-wide font-semibold">{label}</div>
                <div className="text-[13px] font-medium text-hugo-black">{val}</div>
              </div>
            ))}
          </div>

          {deal.investmentCaseNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Justification</div>
              <div className="text-[12px] text-amber-700 leading-relaxed">{deal.investmentCaseNotes}</div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-hugo-muted uppercase tracking-widest mb-3">P&L Analysis</div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" style={{ minHeight: '400px' }}>
              <PLPanel result={deal.proposedPL} inputs={deal.inputs} mode="proposed" />
              <PLPanel result={deal.floorPL} inputs={deal.inputs} mode="floor" />
            </div>
          </div>

          {mode === 'review' && (
            <div className="border-t border-cream-300 pt-5 space-y-4">
              <div className="text-[11px] font-bold text-hugo-muted uppercase tracking-widest">Your Decision</div>
              <div>
                <div className="field-label">Your name</div>
                <input className="hugo-input w-64" value={reviewerName} onChange={e => onReviewerNameChange(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <div className="field-label">Review notes {isInv || isBelowFloor ? '*' : '(optional)'}</div>
                <textarea rows={3} className="hugo-input resize-none" value={reviewNotes} onChange={e => onReviewNotesChange(e.target.value)}
                  placeholder={isInv ? 'Required: reason for your decision' : 'Any comments on this deal…'} />
              </div>
            </div>
          )}

          {mode === 'view' && (deal.reviewedBy || deal.reviewNotes) && (
            <div className="border-t border-cream-300 pt-4">
              <div className="text-[11px] font-bold text-hugo-muted uppercase tracking-widest mb-3">Review Record</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[12px]">
                {deal.reviewedBy && <div><span className="text-hugo-muted">By: </span><span className="font-medium">{deal.reviewedBy}</span></div>}
                {deal.reviewedAt && <div><span className="text-hugo-muted">Date: </span><span className="font-medium">{new Date(deal.reviewedAt).toLocaleDateString('en-GB')}</span></div>}
                {deal.status && <div><span className="text-hugo-muted">Decision: </span><span className={`font-bold ${deal.status === 'approved' ? 'text-emerald-700' : 'text-red-600'}`}>{STATUS_LABEL[deal.status]}</span></div>}
                {deal.reviewNotes && <div className="col-span-full"><span className="text-hugo-muted">Notes: </span>{deal.reviewNotes}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-cream-300 flex gap-3 rounded-b-2xl bg-cream-100">
          {mode === 'review' ? (
            <>
              <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              <button onClick={onReject} className="btn-danger flex-1">Reject</button>
              <button onClick={onApprove} className="btn-success flex-1">Approve</button>
            </>
          ) : (
            <button onClick={onClose} className="btn-ghost">Close</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DealsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const [deals, setDeals]             = useState<Deal[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGeo, setFilterGeo]     = useState('all')
  const [search, setSearch]           = useState('')
  const [modalDeal, setModalDeal]     = useState<Deal | null>(null)
  const [modalMode, setModalMode]     = useState<'review' | 'view'>('view')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [notifyError, setNotifyError] = useState('')
  const [sortKey, setSortKey]         = useState<SortKey>('submittedAt')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')

  const refresh = useCallback(async () => setDeals(await getDeals()), [])

  useEffect(() => {
    const init = async () => {
      const a = loadAssumptions()
      await checkOverdueDeals(a.approvalWindowHours)
      const allDeals = await getDeals()
      setDeals(allDeals)

      const targetId = searchParams.get('id')
      if (targetId) {
        const target = allDeals.find(d => d.id === targetId)
        if (target) {
          const canReview = (target.status === 'pending_review' || target.status === 'overdue') &&
                            isReviewer(user?.email) && target.inputs.salespersonEmail !== user?.email
          setModalDeal(target)
          setModalMode(canReview ? 'review' : 'view')
          setReviewNotes(''); setReviewerName('')
        }
        router.replace('/deals', { scroll: false })
      }
    }
    init()
  }, [searchParams, router, user?.email])

  const handleApprove = async () => {
    if (!modalDeal) return
    await updateDealStatus(modalDeal.id, 'approved', reviewerName || 'Reviewer', reviewNotes)
    try {
      await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: modalDeal.id, type: 'approved',
          deal: { ...modalDeal, reviewNotes, reviewedBy: reviewerName || 'Reviewer' },
          submitterEmail: modalDeal.inputs.salespersonEmail }),
      })
    } catch { setNotifyError('Approval saved but email notification failed.') }
    setModalDeal(null); setReviewNotes(''); refresh()
  }

  const handleReject = async () => {
    if (!modalDeal) return
    if (!reviewNotes.trim()) { alert('Please provide a reason for rejection.'); return }
    await updateDealStatus(modalDeal.id, 'rejected', reviewerName || 'Reviewer', reviewNotes)
    try {
      await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: modalDeal.id, type: 'rejected',
          deal: { ...modalDeal, reviewNotes, reviewedBy: reviewerName || 'Reviewer' },
          submitterEmail: modalDeal.inputs.salespersonEmail }),
      })
    } catch { setNotifyError('Rejection saved but email notification failed.') }
    setModalDeal(null); setReviewNotes(''); refresh()
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const sortIcon = (key: SortKey) => sortKey !== key
    ? <span className="text-cream-400 ml-1">⇅</span>
    : <span className="text-hugo-gold ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>

  const filtered = deals
    .filter(d => {
      if (filterStatus !== 'all' && d.status !== filterStatus) return false
      if (filterGeo !== 'all' && d.inputs.geography !== filterGeo) return false
      if (search) {
        const q = search.toLowerCase()
        return d.inputs.clientName.toLowerCase().includes(q) ||
               d.inputs.salesperson.toLowerCase().includes(q) || d.id.includes(q)
      }
      return true
    })
    .sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      switch (sortKey) {
        case 'submittedAt':  av = a.submittedAt; bv = b.submittedAt; break
        case 'clientName':   av = a.inputs.clientName.toLowerCase(); bv = b.inputs.clientName.toLowerCase(); break
        case 'geography':    av = a.inputs.geography; bv = b.inputs.geography; break
        case 'floorRate':    av = a.floorPL.floorRate; bv = b.floorPL.floorRate; break
        case 'proposedRate': av = a.inputs.proposedRate; bv = b.inputs.proposedRate; break
        case 'proposedGM':   av = a.proposedPL.grossMarginPct; bv = b.proposedPL.grossMarginPct; break
        case 'status':       av = a.status; bv = b.status; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () =>
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(d => d.id)))

  const SortTh = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <th onClick={() => handleSort(sKey)}
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-hugo-muted whitespace-nowrap cursor-pointer hover:text-hugo-black select-none">
      {label}{sortIcon(sKey)}
    </th>
  )

  return (
    <AuthGuard>
    <div className="min-h-screen bg-cream-100">
      <Nav />

      {notifyError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-sm text-center py-2.5 flex items-center justify-center gap-3">
          {notifyError}<button onClick={() => setNotifyError('')} className="text-amber-500 hover:text-amber-700">✕</button>
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
          <button onClick={() => downloadCSV(dealsToCSV(selectedIds.size > 0 ? deals.filter(d => selectedIds.has(d.id)) : filtered), `hugo-deals-${new Date().toISOString().split('T')[0]}.csv`)} className="btn-ghost">
            Export {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'all'} CSV
          </button>
        </div>

        <div className="bg-cream-50 border border-cream-300 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
          <input className="hugo-input w-52" placeholder="Search client, salesperson or ID…"
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

        <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="font-serif text-hugo-black text-xl mb-2">No deals found</div>
              <div className="text-[12px] text-hugo-muted">Submit a deal from the calculator to see it here.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: '900px' }}>
                <thead>
                  <tr className="border-b border-cream-300 bg-cream-100">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll} />
                    </th>
                    <SortTh label="Client"     sKey="clientName" />
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-hugo-muted">Salesperson</th>
                    <SortTh label="Geography"  sKey="geography" />
                    <SortTh label="Floor Rate" sKey="floorRate" />
                    <SortTh label="Proposed"   sKey="proposedRate" />
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-hugo-muted whitespace-nowrap">Floor GM</th>
                    <SortTh label="Prop. GM"   sKey="proposedGM" />
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-hugo-muted whitespace-nowrap">Flag</th>
                    <SortTh label="Status"     sKey="status" />
                    <SortTh label="Submitted"  sKey="submittedAt" />
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((deal, i) => {
                    const canReview = (deal.status === 'pending_review' || deal.status === 'overdue') &&
                                      isReviewer(user?.email) && deal.inputs.salespersonEmail !== user?.email
                    const isComplete = deal.status === 'approved' || deal.status === 'rejected'
                    const isBelowFloor = !deal.proposedPL.investmentCaseRequired && deal.inputs.proposedRate < deal.floorPL.floorRate

                    return (
                      <tr key={deal.id} className={`border-b border-cream-200 ${i % 2 === 0 ? 'bg-cream-50' : 'bg-cream-100/50'} hover:bg-cream-200/40 transition-colors`}>
                        <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(deal.id)} onChange={() => toggleSelect(deal.id)} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setModalDeal(deal); setModalMode('view') }}
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
                            ? <span className="font-bold text-red-500">Red</span>
                            : isBelowFloor
                              ? <span className="font-bold text-amber-600">Amber</span>
                              : <span className="text-emerald-600">Green</span>}
                        </td>
                        <td className="px-4 py-3"><span className={STATUS_CLASS[deal.status]}>{STATUS_LABEL[deal.status]}</span></td>
                        <td className="px-4 py-3 text-[11px] text-hugo-muted whitespace-nowrap">
                          {new Date(deal.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 flex gap-1.5">
                          {canReview && (
                            <button onClick={() => { setModalDeal(deal); setModalMode('review'); setReviewNotes(''); setReviewerName('') }}
                              className={`btn-ghost text-[11px] px-3 py-1 ${deal.status === 'overdue' ? 'border-orange-300 text-orange-600' : ''}`}>
                              Review
                            </button>
                          )}
                          <button onClick={() => { setModalDeal(deal); setModalMode('view') }}
                            className="btn-ghost text-[11px] px-3 py-1">
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalDeal && (
        <DealModal
          deal={modalDeal} mode={modalMode}
          reviewNotes={reviewNotes} reviewerName={reviewerName}
          onReviewNotesChange={setReviewNotes} onReviewerNameChange={setReviewerName}
          onApprove={handleApprove} onReject={handleReject}
          onClose={() => setModalDeal(null)}
        />
      )}
    </div>
    </AuthGuard>
  )
}
