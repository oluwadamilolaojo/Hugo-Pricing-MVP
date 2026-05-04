'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Nav from '@/components/Nav'
import PLPanel from '@/components/PLPanel'
import { calculatePL, getFloorRate, fmt } from '@/lib/calculations'
import { loadAssumptions } from '@/lib/assumptions'
import { saveDeal } from '@/lib/storage'
import type { DealInputs, Assumptions, Deal } from '@/lib/types'
import { v4 as uuid } from 'uuid'

const DEFAULT_INPUTS: DealInputs = {
  clientName:'', salesperson:'', salespersonEmail:'',
  dateOfPricing: new Date().toISOString().split('T')[0],
  geography:'Nigeria', division:'CX',
  commercialModel:'Cost per Scheduled Hour',
  serviceType:'Voice CX', complexityTier:'Standard', dealDuration:12,
  billableAgents:10, billableQAs:1, billableTLs:1,
  qaAgentRatio:40, tlAgentRatio:15,
  agentBuffers:1, qaBuffers:0, tlBuffers:0,
  weeklyHours:40, shiftType:'Single (9-5)',
  weekendCoverage:false, weekendAgents:0,
  deviceType:'Lenovo (standard)', workingLocation:'Remote',
  proposedRate:14, revenueReduction:0, fxRate:1500,
  ratePresentation:'Combined',
  recruitmentCost:0, setupCost:0, otherOneOffCost:0,
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return <div className="sec-label">{children}</div>
}

function ChipGroup({ options, value, onChange, goldValue }: {
  options: string[]; value: string; onChange: (v: string) => void; goldValue?: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`chip ${o === value ? (o === goldValue ? 'chip-gold' : 'chip-active') : ''}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function NumField({ label, value, onChange, min, max, step=1, prefix }: {
  label: string; value: number; onChange:(v:number)=>void; min?:number; max?:number; step?:number; prefix?:string
}) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2 text-hugo-muted text-sm">{prefix}</span>}
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value)||0)}
          className={`hugo-input ${prefix ? 'pl-7' : ''}`} />
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange:(v:string)=>void; options:string[]
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
  const [assumptions, setAssumptions] = useState<Assumptions|null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [investmentNotes, setInvestmentNotes] = useState('')
  const [activeView, setActiveView] = useState<'inputs'|'floor'|'proposed'|'both'>('both')

  useEffect(() => { setAssumptions(loadAssumptions()) }, [])

  const set = useCallback((key: keyof DealInputs, value: unknown) => {
    setInputs(prev => ({ ...prev, [key]: value }))
  }, [])

  const floorPL  = useMemo(() => assumptions ? calculatePL(inputs, assumptions, 'floor') : null, [inputs, assumptions])
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
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ dealId:deal.id, type:'submitted', deal, approverEmail:assumptions.approverEmail }),
      })
    } catch {}
    setSubmitting(false); setSubmitted(true)
    setTimeout(() => { setSubmitted(false); setInputs(DEFAULT_INPUTS); setInvestmentNotes('') }, 4000)
  }

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

      <div className="max-w-screen-2xl mx-auto px-6 py-8">

        {/* Page hero */}
        <div className="mb-8">
          <h1 className="font-serif text-[32px] text-hugo-black leading-tight">
            Price your <em className="text-hugo-gold not-italic">next deal.</em>
          </h1>
          <p className="text-[12px] text-hugo-muted mt-1 max-w-sm">
            Real numbers, no surprises — leadership and ops costs always included.
          </p>
        </div>

        {/* Mobile tab switcher */}
        <div className="flex gap-1.5 mb-5 xl:hidden">
          {(['inputs','floor','proposed','both'] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`chip text-xs ${activeView===v ? 'chip-active' : ''}`}>
              {v==='both' ? 'Both P&Ls' : v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-6 items-start">

          {/* ── INPUTS PANEL ───────────────────────────────────────────── */}
          <div className={`${activeView==='floor'||activeView==='proposed' ? 'hidden xl:block' : ''}`}>
            <div className="bg-cream-50 rounded-2xl border border-cream-300 p-6">

              {/* 1. Deal basics */}
              <SecLabel>1 · Deal basics</SecLabel>
              <div className="grid grid-cols-2 gap-3 mb-1">
                <div className="col-span-2">
                  <div className="field-label">Client name</div>
                  <input className="hugo-input" value={inputs.clientName}
                    onChange={e => set('clientName', e.target.value)} placeholder="e.g. GiftHealth" />
                </div>
                <div>
                  <div className="field-label">Salesperson</div>
                  <input className="hugo-input" value={inputs.salesperson}
                    onChange={e => set('salesperson', e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <div className="field-label">Email</div>
                  <input className="hugo-input" type="email" value={inputs.salespersonEmail}
                    onChange={e => set('salespersonEmail', e.target.value)} placeholder="your@hugo.co" />
                </div>
                <div>
                  <div className="field-label">Date</div>
                  <input className="hugo-input" type="date" value={inputs.dateOfPricing}
                    onChange={e => set('dateOfPricing', e.target.value)} />
                </div>
                <div>
                  <div className="field-label">Duration (months)</div>
                  <input className="hugo-input" type="number" min={1} max={60} value={inputs.dealDuration}
                    onChange={e => set('dealDuration', parseInt(e.target.value)||12)} />
                </div>
              </div>

              {/* 2. Geography & division */}
              <SecLabel>2 · Geography</SecLabel>
              <ChipGroup
                options={['Nigeria','South Africa','United States']}
                value={inputs.geography}
                onChange={v => set('geography', v as DealInputs['geography'])}
                goldValue={inputs.geography}
              />
              <div className="flex gap-1.5 mt-2">
                {['CX','AI Ops'].map(d => (
                  <button key={d} onClick={() => set('division', d as DealInputs['division'])}
                    className={`chip ${inputs.division===d ? 'chip-active' : ''}`}>{d}</button>
                ))}
              </div>

              {/* 3. Service & model */}
              <SecLabel>3 · Service & commercial model</SecLabel>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Non-Voice CX','Voice CX','Back Office Standard','Back Office Specialized T1','Back Office Specialized T2','Back Office Specialized T3'].map(s => (
                  <button key={s} onClick={() => set('serviceType', s as DealInputs['serviceType'])}
                    className={`chip ${inputs.serviceType===s ? 'chip-active' : ''}`}>
                    {s.replace('Back Office ','BO ').replace('Specialized ','Spec ')}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Cost per Scheduled Hour','Cost per Productive Hour','Full Productive Hour'].map(m => (
                  <button key={m} onClick={() => set('commercialModel', m as DealInputs['commercialModel'])}
                    className={`chip ${inputs.commercialModel===m ? 'chip-active' : ''}`}>
                    {m.replace('Cost per ','')}
                  </button>
                ))}
              </div>

              {/* 4. Team */}
              <SecLabel>4 · Team configuration</SecLabel>
              <div className="bg-amber-50/60 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-700 mb-3">
                QA and TL ratios are editable — clients often specify their own. Small deals (&lt;5 agents): use dedicated TL ratio of 5:1.
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <NumField label="Agents" value={inputs.billableAgents} onChange={v=>set('billableAgents',v)} min={1} />
                <NumField label="Billable QAs" value={inputs.billableQAs} onChange={v=>set('billableQAs',v)} min={0} />
                <NumField label="Billable TLs" value={inputs.billableTLs} onChange={v=>set('billableTLs',v)} min={0} />
                <NumField label="QA ratio" value={inputs.qaAgentRatio} onChange={v=>set('qaAgentRatio',v)} min={1} />
                <NumField label="TL ratio" value={inputs.tlAgentRatio} onChange={v=>set('tlAgentRatio',v)} min={1} />
                <SelectField label="Complexity" value={inputs.complexityTier} onChange={v=>set('complexityTier',v as DealInputs['complexityTier'])} options={['Standard','Intermediate','High']} />
                <NumField label="Agent buffers" value={inputs.agentBuffers} onChange={v=>set('agentBuffers',v)} min={0} />
                <NumField label="QA buffers" value={inputs.qaBuffers} onChange={v=>set('qaBuffers',v)} min={0} />
                <NumField label="TL buffers" value={inputs.tlBuffers} onChange={v=>set('tlBuffers',v)} min={0} />
              </div>

              {/* 5. Operating hours */}
              <SecLabel>5 · Operating hours</SecLabel>
              <div className="grid grid-cols-2 gap-2.5">
                <NumField label="Weekly hours" value={inputs.weeklyHours} onChange={v=>set('weeklyHours',v)} min={1} max={168} />
                <SelectField label="Shift type" value={inputs.shiftType} onChange={v=>set('shiftType',v as DealInputs['shiftType'])} options={['Single (9-5)','Double Day','All Day / 24-7']} />
                <SelectField label="Weekend coverage" value={inputs.weekendCoverage?'Yes':'No'} onChange={v=>set('weekendCoverage',v==='Yes')} options={['No','Yes']} />
                {inputs.weekendCoverage && <NumField label="Weekend agents" value={inputs.weekendAgents} onChange={v=>set('weekendAgents',v)} min={0} />}
              </div>

              {/* 6. Infrastructure */}
              <SecLabel>6 · Infrastructure & device</SecLabel>
              <div className="grid grid-cols-2 gap-2.5">
                <SelectField label="Device" value={inputs.deviceType} onChange={v=>set('deviceType',v as DealInputs['deviceType'])} options={['Lenovo (standard)','Apple MacBook']} />
                <SelectField label="Location" value={inputs.workingLocation} onChange={v=>set('workingLocation',v as DealInputs['workingLocation'])} options={['Remote','In-Office','Clean Room']} />
              </div>

              {/* 7. Pricing */}
              <SecLabel>7 · Proposed pricing</SecLabel>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rate-box-floor">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mb-1">Floor rate (auto)</div>
                  <div className="font-serif text-[22px] text-amber-700">{fmt(floorRate)}<span className="text-[12px] text-amber-500">/hr</span></div>
                  <div className="text-[10px] text-amber-500 mt-0.5">Minimum acceptable</div>
                </div>
                <div className="rate-box-proposed">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Your proposed rate</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-[18px] text-emerald-700">$</span>
                    <input type="number" step={0.5} min={0} value={inputs.proposedRate}
                      onChange={e => set('proposedRate', parseFloat(e.target.value)||0)}
                      className="font-serif text-[22px] text-emerald-700 bg-transparent border-none outline-none w-full" />
                  </div>
                  <div className="text-[10px] text-emerald-500 mt-0.5">USD / hr</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                <div>
                  <div className="field-label">Revenue reduction %</div>
                  <div className="relative">
                    <input type="number" min={0} max={100} step={0.5}
                      value={(inputs.revenueReduction*100).toFixed(1)}
                      onChange={e => set('revenueReduction',(parseFloat(e.target.value)||0)/100)}
                      className="hugo-input pr-6" />
                    <span className="absolute right-3 top-2 text-hugo-muted text-sm">%</span>
                  </div>
                </div>
                <NumField label="FX rate (1 = USD deal)" value={inputs.fxRate} onChange={v=>set('fxRate',v)} min={1} />
              </div>

              {/* Investment case */}
              {isInv && (
                <div className="mt-4 bg-red-950/30 border border-red-800/40 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-red-400 mb-1">Investment Case Required</div>
                  <div className="text-[10px] text-red-400/70 mb-3">
                    Proposed margin ({fmt(proposedPL!.grossMarginPct,'pct')}) is below
                    the {fmt(assumptions.marginFloors[inputs.geography as keyof typeof assumptions.marginFloors],'pct')} floor for {inputs.geography}.
                  </div>
                  <div className="field-label text-red-400">Justification *</div>
                  <textarea rows={3}
                    className="hugo-input resize-none text-[11px]"
                    placeholder="Strategic rationale, growth potential, volume commitment…"
                    value={investmentNotes}
                    onChange={e => setInvestmentNotes(e.target.value)} />
                </div>
              )}

              {/* 8. One-off costs */}
              <SecLabel>8 · One-off costs</SecLabel>
              <div className="grid grid-cols-1 gap-2">
                <NumField label="Recruitment & onboarding (USD total)" value={inputs.recruitmentCost} onChange={v=>set('recruitmentCost',v)} min={0} prefix="$" />
                <NumField label="Setup / IT equipment (USD total)" value={inputs.setupCost} onChange={v=>set('setupCost',v)} min={0} prefix="$" />
                <NumField label="Other one-off costs (USD total)" value={inputs.otherOneOffCost} onChange={v=>set('otherOneOffCost',v)} min={0} prefix="$" />
              </div>

              {/* Submit */}
              <div className="mt-6 pt-5 border-t border-cream-300">
                <button
                  onClick={handleSubmit}
                  disabled={submitting||!inputs.clientName||!inputs.salesperson||!inputs.salespersonEmail||(!!isInv&&!investmentNotes.trim())}
                  className="btn-submit disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting…' : 'Submit for approval →'}
                </button>
                {isInv && !investmentNotes.trim() && (
                  <p className="text-[10px] text-red-400 text-center mt-2">Investment case justification required before submission.</p>
                )}
              </div>

            </div>
          </div>

          {/* ── P&L OUTPUTS ────────────────────────────────────────────── */}
          <div className={`${activeView==='inputs' ? 'hidden xl:block' : ''} flex flex-col gap-4`}>

            {/* Quick comparison bar */}
            {floorPL && proposedPL && (
              <div className="bg-cream-50 border border-cream-300 rounded-2xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label:'Floor rate', val:fmt(floorPL.floorRate), sub:'Minimum' },
                    { label:'Proposed rate', val:fmt(inputs.proposedRate), sub:'Your rate', warn:inputs.proposedRate<floorPL.floorRate },
                    { label:'Floor GM', val:fmt(floorPL.grossMarginPct,'pct'), sub:`Floor ${fmt(floorPL.marginFloor,'pct')}`, ok:!floorPL.investmentCaseRequired },
                    { label:'Proposed GM', val:fmt(proposedPL.grossMarginPct,'pct'), sub:`Floor ${fmt(proposedPL.marginFloor,'pct')}`, ok:!proposedPL.investmentCaseRequired },
                  ].map(item => (
                    <div key={item.label} className={`rounded-xl p-3 text-center border ${item.warn||item.ok===false ? 'bg-red-50 border-red-200' : item.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-cream-100 border-cream-300'}`}>
                      <div className="text-[10px] text-hugo-muted mb-0.5">{item.label}</div>
                      <div className={`font-serif text-[22px] ${item.warn||item.ok===false ? 'text-red-700' : item.ok ? 'text-emerald-700' : 'text-hugo-black'}`}>{item.val}</div>
                      <div className="text-[10px] text-hugo-muted">{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dual P&L panels */}
            {floorPL && proposedPL && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {(activeView==='floor'||activeView==='both'||activeView==='inputs') && (
                  <PLPanel result={floorPL} inputs={inputs} mode="floor" />
                )}
                {(activeView==='proposed'||activeView==='both'||activeView==='inputs') && (
                  <PLPanel result={proposedPL} inputs={inputs} mode="proposed" />
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
