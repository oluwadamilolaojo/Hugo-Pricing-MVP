'use client'
// app/calculator/page.tsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import Nav from '@/components/Nav'
import PLPanel from '@/components/PLPanel'
import { calculatePL, getFloorRate, fmt } from '@/lib/calculations'
import { loadAssumptions } from '@/lib/assumptions'
import { saveDeal } from '@/lib/storage'
import type { DealInputs, Assumptions, Deal } from '@/lib/types'
import { v4 as uuid } from 'uuid'

const DEFAULT_INPUTS: DealInputs = {
  clientName: '', salesperson: '', salespersonEmail: '', dateOfPricing: new Date().toISOString().split('T')[0],
  geography: 'Nigeria', division: 'CX', commercialModel: 'Cost per Scheduled Hour',
  serviceType: 'Non-Voice CX', complexityTier: 'Standard', dealDuration: 12,
  billableAgents: 10, billableQAs: 1, billableTLs: 1, qaAgentRatio: 40, tlAgentRatio: 15,
  agentBuffers: 1, qaBuffers: 0, tlBuffers: 0,
  weeklyHours: 40, shiftType: 'Single (9-5)', weekendCoverage: false, weekendAgents: 0,
  deviceType: 'Lenovo (standard)', workingLocation: 'Remote',
  proposedRate: 14, revenueReduction: 0, fxRate: 1500, ratePresentation: 'Combined',
  recruitmentCost: 0, setupCost: 0, otherOneOffCost: 0,
}

function SectionHeader({ title }: { title: string }) {
  return <div className="bg-navy-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg mb-3 mt-5 first:mt-0">{title}</div>
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className="input-field" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function NumberInput({ value, onChange, min, max, step = 1, prefix }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; prefix?: string
}) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-2 text-gray-400 text-sm">{prefix}</span>}
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`input-field ${prefix ? 'pl-7' : ''}`}
      />
    </div>
  )
}

export default function Calculator() {
  const [inputs, setInputs] = useState<DealInputs>(DEFAULT_INPUTS)
  const [assumptions, setAssumptions] = useState<Assumptions | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedDealId, setSubmittedDealId] = useState<string | null>(null)
  const [showInvestmentCase, setShowInvestmentCase] = useState(false)
  const [investmentNotes, setInvestmentNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'inputs' | 'floor' | 'proposed' | 'both'>('both')

  useEffect(() => { setAssumptions(loadAssumptions()) }, [])

  const set = useCallback((key: keyof DealInputs, value: unknown) => {
    setInputs(prev => ({ ...prev, [key]: value }))
  }, [])

  const floorPL = useMemo(() => {
    if (!assumptions) return null
    return calculatePL(inputs, assumptions, 'floor')
  }, [inputs, assumptions])

  const proposedPL = useMemo(() => {
    if (!assumptions) return null
    return calculatePL(inputs, assumptions, 'proposed')
  }, [inputs, assumptions])

  const floorRate = useMemo(() => {
    if (!assumptions) return 0
    return getFloorRate(inputs, assumptions)
  }, [inputs, assumptions])

  const handleSubmit = async () => {
    if (!floorPL || !proposedPL || !assumptions) return
    if (proposedPL.investmentCaseRequired && !investmentNotes.trim()) {
      setShowInvestmentCase(true)
      return
    }
    setSubmitting(true)
    const deal: Deal = {
      id: uuid(),
      inputs: { ...inputs },
      floorPL, proposedPL,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      submittedBy: inputs.salesperson || 'Unknown',
      investmentCaseNotes: investmentNotes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveDeal(deal)
    // Notify via API
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          type: 'submitted',
          deal,
          approverEmail: assumptions.approverEmail,
        }),
      })
    } catch {}
    setSubmitting(false)
    setSubmitted(true)
    setSubmittedDealId(deal.id)
    setTimeout(() => { setSubmitted(false); setInputs(DEFAULT_INPUTS); setInvestmentNotes('') }, 4000)
  }

  if (!assumptions) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading…</div>
  }

  const isInvestmentCase = proposedPL?.investmentCaseRequired

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      {/* Status bar */}
      {submitted && (
        <div className="bg-green-700 text-white text-sm text-center py-3 font-medium">
          ✓ Deal submitted for review. ID: {submittedDealId} — Approver has been notified.
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-700">Pricing Calculator</h1>
            <p className="text-gray-500 text-sm">Complete deal inputs to generate P&L analysis</p>
          </div>
          {/* Mobile tab selector */}
          <div className="flex gap-1 lg:hidden">
            {(['inputs','floor','proposed','both'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium ${activeTab===t ? 'bg-navy-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {t === 'both' ? '⬌' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
          {/* ── LEFT: Deal Inputs ─────────────────────────────────────────── */}
          <div className={`${activeTab !== 'inputs' && activeTab !== 'both' ? 'hidden lg:block' : ''}`}>
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-navy-700">Deal Inputs</h2>
                <button onClick={() => setInputs(DEFAULT_INPUTS)} className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
              </div>

              {/* 1. Deal Basics */}
              <SectionHeader title="1 · Deal Basics" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client name">
                  <input className="input-field" value={inputs.clientName} onChange={e => set('clientName', e.target.value)} placeholder="Client name" />
                </Field>
                <Field label="Salesperson">
                  <input className="input-field" value={inputs.salesperson} onChange={e => set('salesperson', e.target.value)} placeholder="Your name" />
                </Field>
                <Field label="Email">
                  <input className="input-field" type="email" value={inputs.salespersonEmail} onChange={e => set('salespersonEmail', e.target.value)} placeholder="your@email.com" />
                </Field>
                <Field label="Date of pricing">
                  <input className="input-field" type="date" value={inputs.dateOfPricing} onChange={e => set('dateOfPricing', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Geography">
                  <Select value={inputs.geography} onChange={v => set('geography', v)} options={['Nigeria','South Africa','United States']} />
                </Field>
                <Field label="Division">
                  <Select value={inputs.division} onChange={v => set('division', v)} options={['CX','AI Ops']} />
                </Field>
                <Field label="Commercial model" note="Defines billing hours">
                  <Select value={inputs.commercialModel} onChange={v => set('commercialModel', v as DealInputs['commercialModel'])} options={['Cost per Scheduled Hour','Cost per Productive Hour','Full Productive Hour']} />
                </Field>
                <Field label="Service type">
                  <Select value={inputs.serviceType} onChange={v => set('serviceType', v as DealInputs['serviceType'])} options={['Non-Voice CX','Voice CX','Back Office Standard','Back Office Specialized T1','Back Office Specialized T2','Back Office Specialized T3']} />
                </Field>
                <Field label="Complexity tier">
                  <Select value={inputs.complexityTier} onChange={v => set('complexityTier', v as DealInputs['complexityTier'])} options={['Standard','Intermediate','High']} />
                </Field>
                <Field label="Deal duration (months)">
                  <NumberInput value={inputs.dealDuration} onChange={v => set('dealDuration', v)} min={1} max={60} />
                </Field>
              </div>

              {/* 2. Team Configuration */}
              <SectionHeader title="2 · Team Configuration" />
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                QA and TL ratios are editable — clients often specify their own ratios.
                Small deals (&lt;5 agents): use dedicated TL ratio of 5:1 or lower.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Billable Agents"><NumberInput value={inputs.billableAgents} onChange={v => set('billableAgents', v)} min={1} /></Field>
                <Field label="Billable QAs"><NumberInput value={inputs.billableQAs} onChange={v => set('billableQAs', v)} min={0} /></Field>
                <Field label="Billable TLs"><NumberInput value={inputs.billableTLs} onChange={v => set('billableTLs', v)} min={0} /></Field>
                <Field label="QA:Agent ratio"><NumberInput value={inputs.qaAgentRatio} onChange={v => set('qaAgentRatio', v)} min={1} /></Field>
                <Field label="TL:Agent ratio"><NumberInput value={inputs.tlAgentRatio} onChange={v => set('tlAgentRatio', v)} min={1} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Agent buffers (non-billable)"><NumberInput value={inputs.agentBuffers} onChange={v => set('agentBuffers', v)} min={0} /></Field>
                <Field label="QA buffers"><NumberInput value={inputs.qaBuffers} onChange={v => set('qaBuffers', v)} min={0} /></Field>
                <Field label="TL buffers"><NumberInput value={inputs.tlBuffers} onChange={v => set('tlBuffers', v)} min={0} /></Field>
              </div>

              {/* 3. Operating Hours */}
              <SectionHeader title="3 · Operating Hours" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weekly hours of operation" note="9-5 Mon–Fri = 40hrs">
                  <NumberInput value={inputs.weeklyHours} onChange={v => set('weeklyHours', v)} min={1} max={168} />
                </Field>
                <Field label="Shift type">
                  <Select value={inputs.shiftType} onChange={v => set('shiftType', v as DealInputs['shiftType'])} options={['Single (9-5)','Double Day','All Day / 24-7']} />
                </Field>
                <Field label="Weekend coverage?">
                  <Select value={inputs.weekendCoverage ? 'Yes' : 'No'} onChange={v => set('weekendCoverage', v === 'Yes')} options={['No','Yes']} />
                </Field>
                {inputs.weekendCoverage && (
                  <Field label="Weekend agents">
                    <NumberInput value={inputs.weekendAgents} onChange={v => set('weekendAgents', v)} min={0} />
                  </Field>
                )}
              </div>

              {/* 4. Infrastructure */}
              <SectionHeader title="4 · Infrastructure & Device" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Device type">
                  <Select value={inputs.deviceType} onChange={v => set('deviceType', v as DealInputs['deviceType'])} options={['Lenovo (standard)','Apple MacBook']} />
                </Field>
                <Field label="Working location">
                  <Select value={inputs.workingLocation} onChange={v => set('workingLocation', v as DealInputs['workingLocation'])} options={['Remote','In-Office','Clean Room']} />
                </Field>
              </div>

              {/* 5. Proposed Pricing */}
              <SectionHeader title="5 · Proposed Pricing" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company floor rate (auto)" note="Min rate for this deal type">
                  <div className="input-field bg-green-50 border-green-200 text-green-800 font-mono font-bold cursor-not-allowed">
                    {fmt(floorRate)}/hr
                  </div>
                </Field>
                <Field label="Your proposed rate (USD/hr)" note="At or above floor rate">
                  <NumberInput value={inputs.proposedRate} onChange={v => set('proposedRate', v)} min={0} step={0.5} prefix="$" />
                </Field>
                <Field label="Rate presentation">
                  <Select value={inputs.ratePresentation} onChange={v => set('ratePresentation', v as DealInputs['ratePresentation'])} options={['Combined','Split']} />
                </Field>
                <Field label="Revenue reduction %">
                  <div className="relative">
                    <input type="number" min={0} max={100} step={0.5} value={(inputs.revenueReduction * 100).toFixed(1)}
                      onChange={e => set('revenueReduction', (parseFloat(e.target.value) || 0) / 100)}
                      className="input-field pr-6" />
                    <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                  </div>
                </Field>
                <Field label="FX rate (cross-currency)" note="1 for USD-only deals">
                  <NumberInput value={inputs.fxRate} onChange={v => set('fxRate', v)} min={1} />
                </Field>
              </div>

              {/* Investment case notice */}
              {isInvestmentCase && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 font-bold text-sm mb-2">⚠ Investment Case Required</p>
                  <p className="text-red-600 text-xs mb-2">
                    Proposed rate ({fmt(inputs.proposedRate)}/hr) results in {fmt(proposedPL!.grossMarginPct,'pct')} gross margin,
                    below the {fmt(assumptions.marginFloors[inputs.geography],'pct')} floor for {inputs.geography}.
                    Please provide justification below.
                  </p>
                  <label className="label text-red-700">Investment case justification *</label>
                  <textarea
                    className="input-field h-20 resize-none"
                    placeholder="Why is this deal worth proceeding below the margin floor? (growth potential, strategic value, volume commitment, etc.)"
                    value={investmentNotes}
                    onChange={e => setInvestmentNotes(e.target.value)}
                  />
                </div>
              )}

              {/* 6. One-off Costs */}
              <SectionHeader title="6 · One-off Costs" />
              <div className="space-y-3">
                <Field label="Recruitment & onboarding (USD total)" note="Amortised over deal duration">
                  <NumberInput value={inputs.recruitmentCost} onChange={v => set('recruitmentCost', v)} min={0} prefix="$" />
                </Field>
                <Field label="Setup / IT equipment (USD total)">
                  <NumberInput value={inputs.setupCost} onChange={v => set('setupCost', v)} min={0} prefix="$" />
                </Field>
                <Field label="Other one-off costs (USD total)">
                  <NumberInput value={inputs.otherOneOffCost} onChange={v => set('otherOneOffCost', v)} min={0} prefix="$" />
                </Field>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !inputs.clientName || !inputs.salesperson || !inputs.salespersonEmail || (!!isInvestmentCase && !investmentNotes.trim())}
                  className="btn-primary flex-1"
                >
                  {submitting ? '⏳ Submitting…' : '🚀 Submit for Approval'}
                </button>
              </div>
              {isInvestmentCase && !investmentNotes.trim() && (
                <p className="text-xs text-red-600 text-center">Investment case justification required before submission.</p>
              )}
            </div>
          </div>

          {/* ── RIGHT: P&L Outputs ─────────────────────────────────────────── */}
          <div className={`${activeTab === 'inputs' ? 'hidden lg:block' : ''}`}>
            {floorPL && proposedPL ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {(activeTab === 'floor' || activeTab === 'both' || !['inputs','proposed'].includes(activeTab)) && (
                  <PLPanel result={floorPL} inputs={inputs} mode="floor" />
                )}
                {(activeTab === 'proposed' || activeTab === 'both' || !['inputs','floor'].includes(activeTab)) && (
                  <PLPanel result={proposedPL} inputs={inputs} mode="proposed" />
                )}
              </div>
            ) : (
              <div className="card flex items-center justify-center h-64 text-gray-400">
                Loading calculations…
              </div>
            )}

            {/* Comparison summary bar */}
            {floorPL && proposedPL && (
              <div className="mt-4 card p-4">
                <h3 className="text-sm font-bold text-navy-700 mb-3">Quick Comparison</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Floor Rate', value: fmt(floorPL.floorRate), sub: 'Minimum acceptable' },
                    { label: 'Proposed Rate', value: fmt(inputs.proposedRate), sub: 'Your rate', highlight: inputs.proposedRate < floorPL.floorRate },
                    { label: 'Floor GM', value: fmt(floorPL.grossMarginPct, 'pct'), sub: `Floor ${fmt(floorPL.marginFloor, 'pct')}`, ok: !floorPL.investmentCaseRequired },
                    { label: 'Proposed GM', value: fmt(proposedPL.grossMarginPct, 'pct'), sub: `Floor ${fmt(proposedPL.marginFloor, 'pct')}`, ok: !proposedPL.investmentCaseRequired },
                  ].map(item => (
                    <div key={item.label} className={`rounded-lg p-3 text-center ${item.highlight ? 'bg-red-50 border border-red-200' : item.ok === false ? 'bg-red-50 border border-red-200' : item.ok ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className={`text-xl font-bold font-mono ${item.highlight || item.ok === false ? 'text-red-700' : item.ok ? 'text-green-700' : 'text-navy-700'}`}>{item.value}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
