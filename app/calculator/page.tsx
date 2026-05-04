'use client'
// Fix 3: Draft auto-save to localStorage
// Fix 4: Progressive disclosure — collapse advanced inputs
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Nav from '@/components/Nav'
import PLPanel from '@/components/PLPanel'
import { calculatePL, getFloorRate, fmt } from '@/lib/calculations'
import { loadAssumptions } from '@/lib/assumptions'
import { saveDeal } from '@/lib/storage'
import type { DealInputs, Assumptions, Deal } from '@/lib/types'
import { v4 as uuid } from 'uuid'

const DRAFT_KEY = 'hugo_calculator_draft'

const DEFAULT_INPUTS: DealInputs = {
  clientName: '', salesperson: '', salespersonEmail: '',
  dateOfPricing: new Date().toISOString().split('T')[0],
  geography: 'Nigeria', division: 'CX',
  commercialModel: 'Cost per Scheduled Hour',
  serviceType: 'Voice CX', complexityTier: 'Standard', dealDuration: 12,
  billableAgents: 10, billableQAs: 1, billableTLs: 1,
  qaAgentRatio: 40, tlAgentRatio: 15,
  agentBuffers: 1, qaBuffers: 0, tlBuffers: 0,
  weeklyHours: 40, shiftType: 'Single (9-5)',
  weekendCoverage: false, weekendAgents: 0,
  deviceType: 'Lenovo (standard)', workingLocation: 'Remote',
  proposedRate: 14, revenueReduction: 0, fxRate: 1500,
  ratePresentation: 'Combined',
  recruitmentCost: 0, setupCost: 0, otherOneOffCost: 0,
}

// Fix 3: Draft save/restore helpers
function saveDraft(inputs: DealInputs) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(inputs)) } catch {}
}
function loadDraft(): DealInputs | null {
  try {
    const s = localStorage.getItem(DRAFT_KEY)
    return s ? { ...DEFAULT_INPUTS, ...JSON.parse(s) } : null
  } catch { return null }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

// Fix 4: Collapsible advanced section
function AdvancedSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-[10px] font-bold uppercase tracking-widest text-hugo-muted hover:text-hugo-black transition-colors"
      >
        <span>{label}</span>
        <span className="text-cream-400 text-base leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="pt-1 pb-2">{children}</div>}
    </div>
  )
}

function SecLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2 first:mt-0">
      <span className="w-5 h-5 rounded-full bg-hugo-black text-cream-100 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{n}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-hugo-muted">{label}</span>
    </div>
  )
}

function ChipGroup({ options, value, onChange, short }: {
  options: string[]; value: string; onChange: (v: string) => void; short?: Record<string, string>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`chip ${o === value ? (o === value ? 'chip-active' : '') : ''}`}
          style={o === value ? { background: '#1A1A1A', color: '#F5F0E8', borderColor: '#1A1A1A' } : {}}>
          {short?.[o] ?? o}
        </button>
      ))}
    </div>
  )
}

function NumField({ label, value, onChange, min, max, step = 1, prefix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; prefix?: string
}) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2 text-hugo-muted text-sm">{prefix}</span>}
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`hugo-input ${prefix ? 'pl-7' : ''}`} />
      </div>
    </div>
  )
}

function SelField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <select className="hugo-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function Calculator() {
  const [inputs, setInputs] = useState<DealInputs>(DEFAULT_INPUTS)
  const [assumptions, setAssumptions] = useState<Assumptions | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [investmentNotes, setInvestmentNotes] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setAssumptions(loadAssumptions())
    const draft = loadDraft()
    if (draft && draft.clientName) {
      setInputs(draft)
      setHasDraft(true)
    }
  }, [])

  // Fix 3: Debounced auto-save on every input change
  const set = useCallback((key: keyof DealInputs, value: unknown) => {
    setInputs(prev => {
      const next = { ...prev, [key]: value }
      // Debounce save to avoid thrashing localStorage on every keystroke
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveDraft(next), 600)
      return next
    })
  }, [])

  const floorPL    = useMemo(() => assumptions ? calculatePL(inputs, assumptions, 'floor') : null, [inputs, assumptions])
  const proposedPL = useMemo(() => assumptions ? calculatePL(inputs, assumptions, 'proposed') : null, [inputs, assumptions])
  const floorRate  = useMemo(() => assumptions ? getFloorRate(inputs, assumptions) : 0, [inputs, assumptions])
  const isInv = proposedPL?.investmentCaseRequired

  const handleSubmit = async () => {
    if (!floorPL || !proposedPL || !assumptions) return
    setSubmitting(true)
    const deal: Deal = {
      id: uuid(), inputs: { ...inputs }, floorPL, proposedPL,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      submittedBy: inputs.salesperson || 'Unknown',
      investmentCaseNotes: investmentNotes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveDeal(deal)
    try {
      await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, type: 'submitted', deal, approverEmail: assumptions.approverEmail }),
      })
    } catch {}
    clearDraft()
    setSubmitting(false); setSubmitted(true); setHasDraft(false)
    setTimeout(() => { setSubmitted(false); setInputs(DEFAULT_INPUTS); setInvestmentNotes('') }, 4000)
  }

  const handleReset = () => { clearDraft(); setInputs(DEFAULT_INPUTS); setInvestmentNotes(''); setHasDraft(false) }

  if (!assumptions) return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center">
      <div className="font-serif text-hugo-black text-xl">Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream-100">
      <Nav />

      {submitted && (
        <div className="bg-hugo-black text-hugo-yellow text-sm text-center py-3 font-medium">
          Deal submitted for approval. Reviewer has been notified.
        </div>
      )}

      {/* Fix 3: Draft restored banner */}
      {hasDraft && !submitted && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-sm text-center py-2 flex items-center justify-center gap-3">
          <span>Draft restored — your previous inputs have been saved.</span>
          <button onClick={handleReset} className="text-amber-500 underline text-xs hover:text-amber-700">Start fresh</button>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-6 py-8">

        {/* Hero */}
        <div className="mb-6">
          <h1 className="font-serif text-[32px] text-hugo-black leading-tight">
            Price your <em className="text-hugo-gold not-italic">next deal.</em>
          </h1>
          <p className="text-[12px] text-hugo-muted mt-1">Real numbers, no surprises — leadership and ops costs always included.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[400px,1fr] gap-6 items-start">

          {/* ── INPUTS ─────────────────────────────────────────────────── */}
          <div>
            <div className="bg-cream-50 rounded-2xl border border-cream-300 p-5">

              {/* 1. Geography */}
              <SecLabel n="1" label="Geography" />
              <ChipGroup
                options={['Nigeria', 'South Africa', 'United States']}
                value={inputs.geography}
                onChange={v => set('geography', v as DealInputs['geography'])}
                short={{ 'South Africa': 'South Africa', 'United States': 'United States' }}
              />
              <div className="flex gap-1.5 mt-2">
                {['CX', 'AI Ops'].map(d => (
                  <button key={d} onClick={() => set('division', d as DealInputs['division'])}
                    className="chip" style={inputs.division === d ? { background: '#1A1A1A', color: '#F5F0E8', borderColor: '#1A1A1A' } : {}}>
                    {d}
                  </button>
                ))}
              </div>

              {/* 2. Service type */}
              <SecLabel n="2" label="Service type" />
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['Non-Voice CX', 'Non-Voice'],
                  ['Voice CX', 'Voice CX'],
                  ['Back Office Standard', 'BO Standard'],
                  ['Back Office Specialized T1', 'BO Spec T1'],
                  ['Back Office Specialized T2', 'BO Spec T2'],
                  ['Back Office Specialized T3', 'BO Spec T3'],
                ].map(([full, short]) => (
                  <button key={full}
                    onClick={() => set('serviceType', full as DealInputs['serviceType'])}
                    className="chip"
                    style={inputs.serviceType === full ? { background: '#1A1A1A', color: '#F5F0E8', borderColor: '#1A1A1A' } : {}}>
                    {short}
                  </button>
                ))}
              </div>

              {/* 3. Commercial model */}
              <SecLabel n="3" label="Commercial model" />
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['Cost per Scheduled Hour', 'Scheduled hrs'],
                  ['Cost per Productive Hour', 'Productive hrs'],
                  ['Full Productive Hour', 'Full productive'],
                ].map(([full, short]) => (
                  <button key={full}
                    onClick={() => set('commercialModel', full as DealInputs['commercialModel'])}
                    className="chip"
                    style={inputs.commercialModel === full ? { background: '#1A1A1A', color: '#F5F0E8', borderColor: '#1A1A1A' } : {}}>
                    {short}
                  </button>
                ))}
              </div>

              {/* 4. Team — just the core numbers visible by default */}
              <SecLabel n="4" label="Team" />
              <div className="grid grid-cols-3 gap-2.5">
                <NumField label="Agents" value={inputs.billableAgents} onChange={v => set('billableAgents', v)} min={1} />
                <NumField label="Billable QAs" value={inputs.billableQAs} onChange={v => set('billableQAs', v)} min={0} />
                <NumField label="Billable TLs" value={inputs.billableTLs} onChange={v => set('billableTLs', v)} min={0} />
              </div>
              <div className="mt-2">
                <SelField label="Complexity" value={inputs.complexityTier} onChange={v => set('complexityTier', v as DealInputs['complexityTier'])} options={['Standard', 'Intermediate', 'High']} />
              </div>

              {/* Fix 4: Advanced team options — collapsed */}
              <AdvancedSection label="Advanced — ratios & buffers">
                <div className="bg-amber-50/60 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-700 mb-3">
                  Clients often specify QA and TL ratios. For small deals (&lt;5 agents) use a dedicated TL ratio of 5:1.
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <NumField label="QA : Agent ratio" value={inputs.qaAgentRatio} onChange={v => set('qaAgentRatio', v)} min={1} />
                  <NumField label="TL : Agent ratio" value={inputs.tlAgentRatio} onChange={v => set('tlAgentRatio', v)} min={1} />
                  <NumField label="Agent buffers" value={inputs.agentBuffers} onChange={v => set('agentBuffers', v)} min={0} />
                  <NumField label="QA buffers" value={inputs.qaBuffers} onChange={v => set('qaBuffers', v)} min={0} />
                  <NumField label="TL buffers" value={inputs.tlBuffers} onChange={v => set('tlBuffers', v)} min={0} />
                </div>
              </AdvancedSection>

              {/* 5. Pricing — the most important section */}
              <SecLabel n="5" label="Pricing" />
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <div className="rounded-xl p-3 bg-amber-50 border border-amber-200">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mb-1">Floor rate (auto)</div>
                  <div className="font-serif text-[22px] text-amber-700">{fmt(floorRate)}<span className="text-[12px] text-amber-400">/hr</span></div>
                  <div className="text-[10px] text-amber-400 mt-0.5">Minimum acceptable</div>
                </div>
                <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Proposed rate</div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-serif text-[18px] text-emerald-700">$</span>
                    <input type="number" step={0.5} min={0} value={inputs.proposedRate}
                      onChange={e => set('proposedRate', parseFloat(e.target.value) || 0)}
                      className="font-serif text-[22px] text-emerald-700 bg-transparent border-none outline-none w-full" />
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">USD / hr</div>
                </div>
              </div>

              {/* Investment case */}
              {isInv && (
                <div className="mt-1 bg-red-950/20 border border-red-800/30 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-red-400 mb-1">Investment Case Required</div>
                  <div className="text-[10px] text-red-400/70 mb-3">
                    {fmt(proposedPL!.grossMarginPct, 'pct')} is below the {fmt(assumptions.marginFloors[inputs.geography as keyof typeof assumptions.marginFloors], 'pct')} floor for {inputs.geography}. Please justify below.
                  </div>
                  <div className="field-label text-red-400">Justification *</div>
                  <textarea rows={2} className="hugo-input resize-none text-[11px]"
                    placeholder="Strategic rationale, growth potential, volume commitment…"
                    value={investmentNotes} onChange={e => setInvestmentNotes(e.target.value)} />
                </div>
              )}

              {/* Fix 4: Advanced pricing — collapsed */}
              <AdvancedSection label="Advanced — revenue reduction, FX, one-off costs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="field-label">Revenue reduction %</div>
                    <div className="relative">
                      <input type="number" min={0} max={100} step={0.5}
                        value={(inputs.revenueReduction * 100).toFixed(1)}
                        onChange={e => set('revenueReduction', (parseFloat(e.target.value) || 0) / 100)}
                        className="hugo-input pr-6" />
                      <span className="absolute right-3 top-2 text-hugo-muted text-sm">%</span>
                    </div>
                  </div>
                  <NumField label="FX rate (1 = USD deal)" value={inputs.fxRate} onChange={v => set('fxRate', v)} min={1} />
                </div>
                <div className="mt-2.5 space-y-2">
                  <NumField label="Recruitment & onboarding (USD total)" value={inputs.recruitmentCost} onChange={v => set('recruitmentCost', v)} min={0} prefix="$" />
                  <NumField label="Setup / IT equipment (USD total)" value={inputs.setupCost} onChange={v => set('setupCost', v)} min={0} prefix="$" />
                  <NumField label="Other one-off costs (USD total)" value={inputs.otherOneOffCost} onChange={v => set('otherOneOffCost', v)} min={0} prefix="$" />
                </div>
              </AdvancedSection>

              {/* Fix 4: Advanced ops — collapsed */}
              <AdvancedSection label="Advanced — operating hours & infrastructure">
                <div className="grid grid-cols-2 gap-2.5">
                  <NumField label="Weekly hours of operation" value={inputs.weeklyHours} onChange={v => set('weeklyHours', v)} min={1} max={168} />
                  <SelField label="Shift type" value={inputs.shiftType} onChange={v => set('shiftType', v as DealInputs['shiftType'])} options={['Single (9-5)', 'Double Day', 'All Day / 24-7']} />
                  <SelField label="Device type" value={inputs.deviceType} onChange={v => set('deviceType', v as DealInputs['deviceType'])} options={['Lenovo (standard)', 'Apple MacBook']} />
                  <SelField label="Working location" value={inputs.workingLocation} onChange={v => set('workingLocation', v as DealInputs['workingLocation'])} options={['Remote', 'In-Office', 'Clean Room']} />
                  <SelField label="Weekend coverage" value={inputs.weekendCoverage ? 'Yes' : 'No'} onChange={v => set('weekendCoverage', v === 'Yes')} options={['No', 'Yes']} />
                  {inputs.weekendCoverage && <NumField label="Weekend agents" value={inputs.weekendAgents} onChange={v => set('weekendAgents', v)} min={0} />}
                </div>
              </AdvancedSection>

              {/* Deal meta — collapsed */}
              <AdvancedSection label="Deal details — name, salesperson, duration">
                <div className="grid grid-cols-1 gap-2.5">
                  <div>
                    <div className="field-label">Client name</div>
                    <input className="hugo-input" value={inputs.clientName} onChange={e => set('clientName', e.target.value)} placeholder="e.g. GiftHealth" />
                  </div>
                  <div>
                    <div className="field-label">Salesperson</div>
                    <input className="hugo-input" value={inputs.salesperson} onChange={e => set('salesperson', e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <div className="field-label">Email</div>
                    <input className="hugo-input" type="email" value={inputs.salespersonEmail} onChange={e => set('salespersonEmail', e.target.value)} placeholder="your@hugo.co" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="field-label">Date of pricing</div>
                      <input className="hugo-input" type="date" value={inputs.dateOfPricing} onChange={e => set('dateOfPricing', e.target.value)} />
                    </div>
                    <NumField label="Duration (months)" value={inputs.dealDuration} onChange={v => set('dealDuration', v)} min={1} max={60} />
                  </div>
                </div>
              </AdvancedSection>

              {/* Submit */}
              <div className="mt-5 pt-4 border-t border-cream-300">
                <button onClick={handleSubmit}
                  disabled={submitting || !inputs.clientName || !inputs.salesperson || !inputs.salespersonEmail || (!!isInv && !investmentNotes.trim())}
                  className="btn-submit disabled:opacity-40 disabled:cursor-not-allowed">
                  {submitting ? 'Submitting…' : 'Submit for approval →'}
                </button>
                {(!inputs.clientName || !inputs.salesperson || !inputs.salespersonEmail) && (
                  <p className="text-[10px] text-hugo-muted text-center mt-2">
                    Open &ldquo;Deal details&rdquo; above to add client name, salesperson and email before submitting.
                  </p>
                )}
                {isInv && !investmentNotes.trim() && (
                  <p className="text-[10px] text-red-400 text-center mt-2">Investment case justification required.</p>
                )}
                {/* Fix 3: Show auto-save status */}
                <p className="text-[9px] text-hugo-muted text-center mt-2">
                  Draft auto-saved · <button onClick={handleReset} className="underline hover:text-hugo-black">Reset</button>
                </p>
              </div>
            </div>
          </div>

          {/* ── P&L OUTPUTS ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {floorPL && proposedPL && (
              <>
                {/* Quick comparison */}
                <div className="bg-cream-50 border border-cream-300 rounded-2xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Floor rate', val: fmt(floorPL.floorRate), sub: 'Minimum', cls: 'text-amber-700' },
                      { label: 'Proposed rate', val: fmt(inputs.proposedRate), sub: inputs.proposedRate < floorPL.floorRate ? 'Below floor ⚠' : 'Your rate', cls: inputs.proposedRate < floorPL.floorRate ? 'text-red-600' : 'text-hugo-black' },
                      { label: 'Floor GM', val: fmt(floorPL.grossMarginPct, 'pct'), sub: `Floor: ${fmt(floorPL.marginFloor, 'pct')}`, cls: floorPL.investmentCaseRequired ? 'text-red-600' : 'text-emerald-700' },
                      { label: 'Proposed GM', val: fmt(proposedPL.grossMarginPct, 'pct'), sub: `Floor: ${fmt(proposedPL.marginFloor, 'pct')}`, cls: proposedPL.investmentCaseRequired ? 'text-red-600' : 'text-emerald-700' },
                    ].map(item => (
                      <div key={item.label} className={`rounded-xl p-3 text-center border ${item.cls.includes('red') ? 'bg-red-50 border-red-200' : item.cls.includes('emerald') ? 'bg-emerald-50 border-emerald-200' : item.cls.includes('amber') ? 'bg-amber-50 border-amber-200' : 'bg-cream-100 border-cream-300'}`}>
                        <div className="text-[10px] text-hugo-muted mb-0.5">{item.label}</div>
                        <div className={`font-serif text-[22px] ${item.cls}`}>{item.val}</div>
                        <div className="text-[10px] text-hugo-muted">{item.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dual P&L panels */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" style={{ minHeight: '600px' }}>
                  <PLPanel result={floorPL} inputs={inputs} mode="floor" />
                  <PLPanel result={proposedPL} inputs={inputs} mode="proposed" />
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
