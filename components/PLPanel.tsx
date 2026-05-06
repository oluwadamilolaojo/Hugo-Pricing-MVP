'use client'
// Fix 5: Gross margin checkpoint first, waterfall expandable below
import { useState } from 'react'
import type { PLResult, DealInputs } from '@/lib/types'
import { fmt } from '@/lib/calculations'

interface Props {
  result: PLResult
  inputs: DealInputs
  mode: 'floor' | 'proposed'
}

const WfRow = ({ label, val, dim }: { label: string; val: string; dim?: boolean }) => (
  <div className="wf-row">
    <span className="wf-label">{label}</span>
    <span className={`wf-val ${dim ? 'text-hugo-faint' : ''}`}>{val}</span>
  </div>
)

const WfSection = ({ label }: { label: string }) => (
  <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-hugo-faint mt-3 mb-1 first:mt-0">{label}</div>
)

export default function PLPanel({ result: r, inputs, mode }: Props) {
  const [costOpen, setCostOpen] = useState(false)
  const [fxOpen, setFxOpen] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)

  const isInv = r.investmentCaseRequired
  const rate = mode === 'floor' ? r.floorRate : inputs.proposedRate
  const isBelowFloor = !isInv && mode === 'proposed' && rate < r.floorRate

  return (
    <div className="flex flex-col bg-hugo-panel text-cream-100 rounded-xl overflow-hidden h-full">

      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-hugo-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-hugo-yellow">
            {mode === 'floor' ? 'Floor Rate P&L' : 'Proposed Rate P&L'}
          </span>
          <span className={isInv ? 'status-bad' : isBelowFloor ? 'status-pending' : 'status-ok'}>
            {isInv ? 'Investment case required' : isBelowFloor ? 'Below floor rate — discuss' : 'Within parameters'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="font-serif text-[36px] text-cream-100 leading-none">{fmt(rate)}</div>
          <div className="text-[12px] text-hugo-faint">/hr · {r.billingHours}hrs/mo</div>
        </div>
      </div>

      {/* Fix 5: Gross margin FIRST — most important number at the top */}
      <div className="px-5 py-4 border-b border-hugo-border">
        <div className={`rounded-xl px-4 py-3.5 flex justify-between items-center ${isInv ? 'bg-red-950/40 border border-red-800/30' : isBelowFloor ? 'bg-amber-950/30 border border-amber-600/30' : 'bg-[#2A240A] border border-hugo-yellow/30'}`}>
          <div>
            <div className={`text-[9px] font-bold uppercase tracking-[0.14em] mb-1 ${isInv ? 'text-red-400' : isBelowFloor ? 'text-amber-400' : 'text-hugo-yellow'}`}>Gross Margin</div>
            <div className={`text-[11px] ${isInv ? 'text-red-400/70' : isBelowFloor ? 'text-amber-400/70' : 'text-amber-400/70'}`}>
              Floor: {fmt(r.marginFloor, 'pct')} · {isInv ? '⚠ below margin floor' : isBelowFloor ? '⚠ rate below floor' : '✓ above floor'}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-serif text-[36px] font-bold leading-none ${isInv ? 'text-red-400' : isBelowFloor ? 'text-amber-400' : 'text-hugo-yellow'}`}>
              {fmt(r.grossMarginPct, 'pct')}
            </div>
            <div className={`text-[11px] font-serif ${isInv ? 'text-red-500' : isBelowFloor ? 'text-amber-500' : 'text-amber-500'}`}>
              {fmt(r.grossMarginUSD)}/hr
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid — key numbers immediately visible */}
      <div className="px-5 py-3 border-b border-hugo-border">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Monthly revenue',  val: fmt(r.totalMonthlyRev, 'usd', 0), green: false },
            { label: 'Annual revenue',   val: fmt(r.totalAnnualRev, 'usd', 0),  green: false },
            { label: 'Monthly GP',       val: fmt(r.monthlyGP, 'usd', 0),       green: true  },
            { label: 'Annual GP',        val: fmt(r.annualGP, 'usd', 0),         green: true  },
          ].map(({ label, val, green }) => (
            <div key={label} className="kpi-box">
              <div className="kpi-box-label">{label}</div>
              <div className={`kpi-box-val ${green ? 'text-emerald-400' : ''}`}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable detail area */}
      <div className="flex-1 overflow-y-auto px-5 py-3">

        {/* Fix 5: Cost waterfall is expandable — not shown by default */}
        <button
          onClick={() => setCostOpen(!costOpen)}
          className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-hugo-faint hover:text-hugo-light transition-colors"
        >
          <span>Cost stack breakdown</span>
          <span className="text-hugo-faint">{costOpen ? '▲' : '▼'} {fmt(r.totalDirectCost)}/hr total</span>
        </button>

        {costOpen && (
          <div className="border-t border-hugo-border pt-2 pb-3">
            <WfSection label="Internal cost" />
            <WfRow label="Agent (salary + G&A + OT gross-up)" val={fmt(r.agentBaseCost)} />
            <WfRow label="QA cost allocation" val={fmt(r.qaCostAlloc)} />
            <WfRow label="TL cost allocation" val={fmt(r.tlCostAlloc)} />
            <WfRow label="PM / SPM / leadership" val={fmt(r.pmAlloc)} />
            <WfRow label="Complexity premium" val={fmt(r.complexityPremium)} dim={r.complexityPremium === 0} />
            <div className="wf-total mt-1">
              <span className="wf-total-label">Total internal cost</span>
              <span className="wf-total-val">{fmt(r.totalInternalCost)}/hr</span>
            </div>

            <WfSection label="Delivery premiums" />
            <WfRow label="Device" val={fmt(r.devicePremium)} dim={r.devicePremium === 0} />
            <WfRow label="Infrastructure" val={fmt(r.infraPremium)} dim={r.infraPremium === 0} />
            <WfRow label="Shift" val={fmt(r.shiftPremium)} dim={r.shiftPremium === 0} />
            <WfRow label="Buffer cost" val={fmt(r.bufferCost)} />
            <WfRow label="Weekend" val={fmt(r.weekendPremium)} dim={r.weekendPremium === 0} />
            <div className="wf-total mt-1" style={{ background: '#1C1C1C' }}>
              <span className="wf-total-label">Total direct delivery cost</span>
              <span className="wf-total-val">{fmt(r.totalDirectCost)}/hr</span>
            </div>

            <WfSection label="P&L waterfall" />
            <WfRow label="Net revenue" val={fmt(r.netRevenue)} />
            <WfRow label="Direct cost (−)" val={fmt(-r.totalDirectCost)} />
            <WfRow label="One-off amortised" val={fmt(r.oneOffAmortized)} dim={r.oneOffAmortized === 0} />
            <div className="wf-total mt-1" style={{ background: '#1C2C0A', borderColor: 'rgba(74,232,142,0.2)' }}>
              <span className="wf-total-label">GM adjusted for setup</span>
              <span className="wf-total-val text-emerald-400">{fmt(r.gmAdjustedPct, 'pct')}</span>
            </div>
          </div>
        )}

        <div className="border-t border-hugo-border" />

        {/* FX sensitivity — expandable */}
        <button
          onClick={() => setFxOpen(!fxOpen)}
          className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-hugo-faint hover:text-hugo-light transition-colors"
        >
          <span>FX sensitivity (±10%)</span>
          <span className="text-red-400">{fmt(r.gmAtMinusTen, 'pct')} worst case {fxOpen ? '▲' : '▼'}</span>
        </button>

        {fxOpen && (
          <div className="border-t border-hugo-border pt-2 pb-3">
            <div className="flex gap-2">
              {[
                { label: '+10% favourable', val: r.gmAtPlusTen, color: 'text-emerald-400' },
                { label: 'Base case', val: r.grossMarginPct, color: 'text-hugo-yellow' },
                { label: '-10% adverse ⚠', val: r.gmAtMinusTen, color: 'text-red-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex-1 bg-hugo-row rounded-lg p-2 text-center">
                  <div className="text-[8px] text-hugo-faint uppercase tracking-wide mb-0.5">{label}</div>
                  <div className={`text-[14px] font-bold font-serif ${color}`}>{fmt(val, 'pct')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-hugo-border" />

        {/* Rate frameworks — expandable */}
        <button
          onClick={() => setRatesOpen(!ratesOpen)}
          className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-hugo-faint hover:text-hugo-light transition-colors"
        >
          <span>Rate in three billing frameworks</span>
          <span>{ratesOpen ? '▲' : '▼'}</span>
        </button>

        {ratesOpen && (
          <div className="border-t border-hugo-border pt-2 pb-3">
            <WfRow label="Payroll Hour (173.3hr) — FTE basis" val={fmt(r.equivPayrollRate)} />
            <WfRow label="Std Billable Hour (152.5hr)" val={fmt(r.equivStdBillRate)} />
            <WfRow label="Productive Hour (128hr)" val={fmt(r.equivProdRate)} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-hugo-border text-[10px] text-hugo-faint flex justify-between">
        <span>{inputs.commercialModel.replace('Cost per ', '')}</span>
        <span>{inputs.geography} · {inputs.division}</span>
      </div>
    </div>
  )
}
