'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import { getFeedback, saveFeedback, feedbackToCSV, downloadCSV, type FeedbackEntry } from '@/lib/storage'
import { useAuth } from '@/lib/AuthContext'
import { v4 as uuid } from 'uuid'

const CATEGORIES: { value: FeedbackEntry['category']; label: string }[] = [
  { value: 'general',     label: 'General' },
  { value: 'calculation', label: 'Calculation issue' },
  { value: 'bug',         label: 'Bug / error' },
  { value: 'ux',          label: 'Usability' },
  { value: 'feature',     label: 'Feature request' },
  { value: 'assumptions', label: 'Assumptions' },
]

const CAT_COLORS: Record<FeedbackEntry['category'], string> = {
  general:     'bg-gray-100 text-gray-700',
  calculation: 'bg-red-100 text-red-700',
  bug:         'bg-orange-100 text-orange-700',
  ux:          'bg-blue-100 text-blue-700',
  feature:     'bg-emerald-100 text-emerald-700',
  assumptions: 'bg-purple-100 text-purple-700',
}

export default function FeedbackPage() {
  const { user } = useAuth()
  const [entries, setEntries]     = useState<FeedbackEntry[]>([])
  const [text, setText]           = useState('')
  const [category, setCategory]   = useState<FeedbackEntry['category']>('general')
  const [dealRef, setDealRef]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch]       = useState('')

  const refresh = () => setEntries(getFeedback())
  useEffect(() => { refresh() }, [])

  const handleSubmit = () => {
    if (!text.trim()) return
    const entry: FeedbackEntry = {
      id:               uuid(),
      submittedBy:      user?.displayName || user?.email || 'Unknown',
      submittedByEmail: user?.email || '',
      submittedAt:      new Date().toISOString(),
      category,
      feedback:         text.trim(),
      dealRef:          dealRef.trim() || undefined,
    }
    saveFeedback(entry)
    setText(''); setDealRef(''); setCategory('general')
    setSubmitted(true)
    refresh()
    setTimeout(() => setSubmitted(false), 3000)
  }

  const filtered = entries.filter(e => {
    if (filterCat !== 'all' && e.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      return e.feedback.toLowerCase().includes(q) ||
             e.submittedBy.toLowerCase().includes(q) ||
             (e.dealRef || '').includes(q)
    }
    return true
  })

  const exportAll = () =>
    downloadCSV(feedbackToCSV(filtered.length > 0 ? filtered : entries),
      `hugo-feedback-${new Date().toISOString().split('T')[0]}.csv`)

  return (
    <AuthGuard>
    <div className="min-h-screen bg-cream-100">
      <Nav />
      <div className="max-w-screen-xl mx-auto px-6 py-8">

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-[32px] text-hugo-black leading-tight">Feedback Log</h1>
            <p className="text-[12px] text-hugo-muted mt-1">
              {entries.length} submissions · helps shape Version 2
            </p>
          </div>
          <button onClick={exportAll} className="btn-ghost">Export CSV</button>
        </div>

        {/* Submit form */}
        <div className="bg-cream-50 border border-cream-300 rounded-2xl p-6 mb-6">
          <h2 className="font-serif text-[18px] text-hugo-black mb-4">Submit feedback</h2>

          {submitted && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-2.5 mb-4 font-medium">
              Feedback submitted.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="field-label">Category</div>
              <select className="hugo-select" value={category}
                onChange={e => setCategory(e.target.value as FeedbackEntry['category'])}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="field-label">Deal reference (optional)</div>
              <input className="hugo-input" value={dealRef}
                onChange={e => setDealRef(e.target.value)}
                placeholder="Deal ID or client name" />
            </div>
            <div>
              <div className="field-label">Submitted by</div>
              <div className="hugo-input bg-cream-100 text-hugo-muted cursor-not-allowed select-none">
                {user?.displayName || user?.email || '—'}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="field-label">Feedback *</div>
            <textarea rows={4} className="hugo-input resize-none"
              placeholder="Describe what you noticed, what was confusing, what could be better, or what is missing…"
              value={text} onChange={e => setText(e.target.value)} />
          </div>

          <button onClick={handleSubmit} disabled={!text.trim()}
            className="btn-submit disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ width: 'auto', paddingLeft: '2rem', paddingRight: '2rem' }}>
            Submit feedback →
          </button>
        </div>

        {/* Filters */}
        <div className="bg-cream-50 border border-cream-300 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
          <input className="hugo-input w-52" placeholder="Search feedback…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="hugo-select w-48" value={filterCat}
            onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <span className="text-[11px] text-hugo-muted ml-auto">{filtered.length} results</span>
        </div>

        {/* Log table */}
        <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="font-serif text-hugo-black text-xl mb-2">No feedback yet</div>
              <div className="text-[12px] text-hugo-muted">Use the form above to submit the first entry.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-300 bg-cream-100">
                    {['Date', 'Submitted by', 'Category', 'Deal ref', 'Feedback'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-hugo-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={e.id} className={`border-b border-cream-200 ${i % 2 === 0 ? 'bg-cream-50' : 'bg-cream-100/50'}`}>
                      <td className="px-4 py-3 text-[11px] text-hugo-muted whitespace-nowrap">
                        {new Date(e.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-hugo-black">{e.submittedBy}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${CAT_COLORS[e.category]}`}>
                          {CATEGORIES.find(c => c.value === e.category)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-hugo-muted font-mono">{e.dealRef || '—'}</td>
                      <td className="px-4 py-3 text-sm text-hugo-black max-w-xl">{e.feedback}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
    </AuthGuard>
  )
}
