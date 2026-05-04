'use client'
import type { PLResult, DealInputs } from '@/lib/types'
import { fmt } from '@/lib/calculations'

interface Props {
  result: PLResult
  inputs: DealInputs
  mode: 'floor' | 'proposed'
}

const WfRow = ({ label, val, dimVal }: { label: string; val: string; dimVal?: boolean }) => (
  <div className="wf-row">
    <span className="wf-label">{label}</span>
    <span className={`wf-val ${dimVal ? 'text-hugo-faint' : ''}`}>{val}</span>
  </div>
)

const SectionDivider = ({ label }: { label: string }) => (
  <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-hugo-faint mt-3 mb-1 first:mt-0">{label}</div>
)

export default function PLPanel({ result: r, inputs, mode }: Props) {
  const isInv = r.investmentCaseRequired
  const rate = mode === 'floor' ? r.floorRate : inputs.proposedRate

  return (
    <div className="flex flex-col h-full bg-hugo-panel text-cream-100 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-hugo-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-hugo-yellow">
            {mode === 'floor' ? 'Floor Rate P&L' : 'Proposed Rate P&L'}
          </span>
          <span className={isInv ? 'status-bad' : 'status-ok'}>
            {isInv ? 'Investment case required' : 'Within parameters'}
          </span>
        </div>
        <div className="font-serif text-[38px] text-cream-100 leading-none">
          {fmt(r.totalMonthlyRev, 'usd', 0)}
        </div>
        <div className="text-[11px] text-hugo-faint mt-1">
          per month · {inputs.billableAgents} agents · {fmt(rate)}/hr
        </div>
      </div>

      {/* Waterfall */}
      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-0">
        <SectionDivider label="Cost stack (per agent / hr)" />
        <WfRow label="Agent base cost (salary + G&A + OT)" val={fmt(r.agentBaseCost)} />
        <WfRow label="QA cost allocation" val={fmt(r.qaCostAlloc)} />
        <WfRow label="TL cost allocation" val={fmt(r.tlCostAlloc)} />
        <WfRow label="PM / SPM / leadership" val={fmt(r.pmAlloc)} />
        <WfRow label="Complexity premium" val={fmt(r.complexityPremium)} dimVal={r.complexityPremium === 0} />
        <WfRow label="Device premium" val={fmt(r.devicePremium)} dimVal={r.devicePremium === 0} />
        <WfRow label="Infrastructure premium" val={fmt(r.infraPremium)} dimVal={r.infraPremium === 0} />
        <WfRow label="Shift premium" val={fmt(r.shiftPremium)} dimVal={r.shiftPremium === 0} />
        <WfRow label="Buffer cost" val={fmt(r.bufferCost)} />
        <div className="wf-total mt-1">
          <span className="wf-total-label">Direct delivery cost</span>
          <span className="wf-total-val">{fmt(r.totalDirectCost)}/hr</span>
        </div>

        <SectionDivider label="P&L waterfall" />
        <WfRow label="Operating revenue" val={fmt(r.operatingRevenue)} />
        <WfRow label="Revenue reduction" val={fmt(r.revenueReduction)} dimVal={r.revenueReduction === 0} />
        <WfRow label="Net revenue" val={fmt(r.netRevenue)} />
        <WfRow label="Direct delivery cost (−)" val={fmt(-r.totalDirectCost)} />

        {/* Gross margin checkpoint */}
        <div className="checkpoint">
          <span className="checkpoint-label">Gross margin</span>
          <div className="text-right">
            <div className="text-[10px] text-amber-400 font-serif">{fmt(r.grossMarginUSD)}/hr</div>
            <div className="text-[22px] font-bold text-hugo-yellow font-serif leading-none">{fmt(r.grossMarginPct, 'pct')}</div>
          </div>
        </div>

        <div className="text-[10px] text-hugo-faint py-1">
          Floor: {fmt(r.marginFloor, 'pct')} · {isInv ? '⚠ below floor' : '✓ above floor'}
        </div>

        <WfRow label="One-off costs (amortised)" val={fmt(r.oneOffAmortized)} dimVal={r.oneOffAmortized === 0} />

        {/* GM adjusted checkpoint */}
        <div className="checkpoint" style={{ borderColor: 'rgba(245,197,24,0.2)' }}>
          <span className="checkpoint-label" style={{ color: '#AAA' }}>GM adjusted for setup</span>
          <div className="text-right">
            <div className="text-[22px] font-bold font-serif leading-none" style={{ color: '#CCC' }}>{fmt(r.gmAdjustedPct, 'pct')}</div>
          </div>
        </div>

        {/* KPI grid */}
        <SectionDivider label="Deal KPIs" />
        <div className="grid grid-cols-2 gap-1.5 my-1">
          {[
            { label: 'Monthly revenue', val: fmt(r.totalMonthlyRev, 'usd', 0) },
            { label: 'Annual revenue',  val: fmt(r.totalAnnualRev, 'usd', 0) },
            { label: 'Monthly GP',      val: fmt(r.monthlyGP, 'usd', 0), green: true },
            { label: 'Annual GP',       val: fmt(r.annualGP, 'usd', 0), green: true },
            { label: 'Rev per agent/mo',val: fmt(r.revenuePerAgent, 'usd', 0) },
            { label: 'Cost per FTE/mo', val: fmt(r.totalCostPerFTE, 'usd', 0) },
          ].map(({ label, val, green }) => (
            <div key={label} className="kpi-box">
              <div className="kpi-box-label">{label}</div>
              <div className={`kpi-box-val ${green ? 'text-emerald-400' : ''}`}>{val}</div>
            </div>
          ))}
        </div>

        {/* Rate frameworks */}
        <SectionDivider label="Rate in three frameworks" />
        <WfRow label="Payroll Hour (173.3hr)" val={fmt(r.equivPayrollRate)} />
        <WfRow label="Std Billable (152.5hr)" val={fmt(r.equivStdBillRate)} />
        <WfRow label="Productive Hour (128hr)" val={fmt(r.equivProdRate)} />

        {/* FX sensitivity */}
        <SectionDivider label="FX sensitivity (±10%)" />
        <div className="flex gap-2 my-1">
          {[
            { label: '+10% (favourable)', val: r.gmAtPlusTen, color: 'text-emerald-400' },
            { label: 'Current',           val: r.grossMarginPct, color: 'text-hugo-yellow' },
            { label: '-10% (adverse)',     val: r.gmAtMinusTen,  color: 'text-red-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex-1 bg-hugo-row rounded-lg p-2 text-center">
              <div className="text-[8px] text-hugo-faint uppercase tracking-wide mb-0.5">{label.split(' ')[0]}</div>
              <div className={`text-[13px] font-bold font-serif ${color}`}>{fmt(val, 'pct')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-hugo-border text-[10px] text-hugo-faint flex justify-between">
        <span>{r.billingHours} hrs/mo · {inputs.commercialModel.replace('Cost per ', '')}</span>
        <span>{inputs.geography} · {inputs.division}</span>
      </div>
    </div>
  )
}
