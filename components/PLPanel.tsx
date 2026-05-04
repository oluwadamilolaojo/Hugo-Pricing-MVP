'use client'
// components/PLPanel.tsx
import type { PLResult, DealInputs } from '@/lib/types'
import { fmt } from '@/lib/calculations'

interface Props {
  result: PLResult
  inputs: DealInputs
  mode: 'floor' | 'proposed'
}

const Row = ({ label, usd, pct, note, className = '' }: {
  label: string; usd?: string; pct?: string; note?: string; className?: string
}) => (
  <tr className={className}>
    <td className="px-3 py-1.5 text-xs text-gray-700 font-medium">{label}</td>
    <td className="px-3 py-1.5 text-xs text-right font-mono text-gray-900">{usd ?? ''}</td>
    <td className="px-3 py-1.5 text-xs text-right font-mono text-gray-900">{pct ?? ''}</td>
    <td className="px-3 py-1.5 text-xs text-gray-500 hidden xl:table-cell">{note ?? ''}</td>
  </tr>
)

const SubHeader = ({ label }: { label: string }) => (
  <tr>
    <td colSpan={4} className="px-3 py-1.5 text-xs font-bold text-navy-600 bg-navy-50 border-y border-navy-100">{label}</td>
  </tr>
)

const TotalRow = ({ label, usd, pct }: { label: string; usd?: string; pct?: string }) => (
  <tr className="bg-amber-50 border-y border-amber-200">
    <td className="px-3 py-2 text-xs font-bold text-amber-800">{label}</td>
    <td className="px-3 py-2 text-xs text-right font-mono font-bold text-amber-800">{usd ?? ''}</td>
    <td className="px-3 py-2 text-xs text-right font-mono font-bold text-amber-800">{pct ?? ''}</td>
    <td className="hidden xl:table-cell" />
  </tr>
)

const CheckpointRow = ({ label, usd, pct }: { label: string; usd?: string; pct?: string }) => (
  <tr className="checkpoint-row">
    <td className="px-3 py-2.5 text-sm font-bold text-white">{label}</td>
    <td className="px-3 py-2.5 text-sm text-right font-mono font-bold text-white">{usd ?? ''}</td>
    <td className="px-3 py-2.5 text-sm text-right font-mono font-bold text-white">{pct ?? ''}</td>
    <td className="hidden xl:table-cell" />
  </tr>
)

export default function PLPanel({ result: r, inputs, mode }: Props) {
  const isInv = r.investmentCaseRequired
  const rateLabel = mode === 'floor' ? 'Company Floor Rate' : 'Proposed Rate'
  const rateColor = mode === 'floor' ? 'text-teal-600' : 'text-navy-600'

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${mode === 'floor' ? 'bg-teal-500' : 'bg-navy-600'}`}>
        <div>
          <p className="text-white text-xs font-medium opacity-80">P&L Analysis</p>
          <p className="text-white font-bold text-sm">{rateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-white text-xs opacity-80">Rate used</p>
          <p className="text-white font-mono font-bold text-lg">
            {mode === 'floor' ? fmt(r.floorRate) : fmt(inputs.proposedRate)}
            <span className="text-xs opacity-70">/hr</span>
          </p>
        </div>
      </div>

      {/* Investment case flag */}
      <div className={`px-4 py-2.5 flex items-center justify-between text-sm font-bold ${isInv ? 'bg-red-700 text-white' : 'bg-green-700 text-white'}`}>
        <span>{isInv ? '⚠ INVESTMENT CASE REQUIRED' : '✓ Within Parameters'}</span>
        <span className="font-mono">{fmt(r.grossMarginPct, 'pct')} vs {fmt(r.marginFloor, 'pct')} floor</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-1/2">Line Item</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">USD/hr</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">%</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 hidden xl:table-cell">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <SubHeader label="▸ Section A — Internal Cost Derivation" />
            <Row label="Agent base cost (salary + G&A + OT gross-up)" usd={fmt(r.agentBaseCost)} note="Salary + G&A + PH gross-up ÷ billing hrs ÷ FX" />
            <Row label="QA cost allocation (ratio-based)" usd={fmt(r.qaCostAlloc)} note={`÷ QA:Agent ratio ${inputs.qaAgentRatio}:1`} className="row-even" />
            <Row label="TL cost allocation (ratio-based)" usd={fmt(r.tlCostAlloc)} note={`÷ TL:Agent ratio ${inputs.tlAgentRatio}:1`} />
            <Row label="PM / SPM / Leadership allocation" usd={fmt(r.pmAlloc)} note="Fixed loading ratios" className="row-even" />
            <Row label="Complexity premium" usd={fmt(r.complexityPremium)} note={`${inputs.complexityTier}: Std=0, Int=+$0.67, High=+$1.34`} />
            <TotalRow label="  Total internal cost per agent/hr" usd={fmt(r.totalInternalCost)} />

            <SubHeader label="▸ Section B — Delivery Premiums" />
            <Row label="Device premium" usd={fmt(r.devicePremium)} note={inputs.deviceType} />
            <Row label="Infrastructure premium" usd={fmt(r.infraPremium)} note={inputs.workingLocation} className="row-even" />
            <Row label="Shift premium" usd={fmt(r.shiftPremium)} note={inputs.shiftType} />
            <Row label="Buffer cost (non-billable roles)" usd={fmt(r.bufferCost)} note="At 100% margin" className="row-even" />
            <Row label="Weekend premium" usd={fmt(r.weekendPremium)} note={inputs.weekendCoverage ? `${inputs.weekendAgents} weekend agents` : 'None'} />
            <TotalRow label="  Total premiums per agent/hr" usd={fmt(r.totalPremiums)} />
            <TotalRow label="  ★ Total direct delivery cost" usd={fmt(r.totalDirectCost)} />

            <SubHeader label="▸ P&L Waterfall" />
            <Row label="Operating revenue per agent/hr" usd={fmt(r.operatingRevenue)} note={rateLabel} />
            <Row label="Revenue reduction" usd={fmt(r.revenueReduction)} note={`${(inputs.revenueReduction * 100).toFixed(1)}% discount`} className="row-even" />
            <Row label="Net revenue per agent/hr" usd={fmt(r.netRevenue)} />
            <Row label="Direct delivery cost (negative)" usd={fmt(-r.totalDirectCost)} className="row-even" />
            <CheckpointRow label="  GROSS MARGIN" usd={fmt(r.grossMarginUSD)} pct={fmt(r.grossMarginPct, 'pct')} />
            <Row label="One-off costs (amortised)" usd={fmt(r.oneOffAmortized)} note="Total one-offs ÷ duration ÷ hrs ÷ agents" />
            <CheckpointRow label="  GM ADJUSTED FOR SETUP COSTS" usd={fmt(r.gmAdjustedUSD)} pct={fmt(r.gmAdjustedPct, 'pct')} />

            <SubHeader label="▸ Rate in Three Frameworks" />
            <Row label="Equiv — Payroll Hour (173.3hr)" usd={fmt(r.equivPayrollRate)} note="FTE basis — compare vs competitors" />
            <Row label="Equiv — Std Billable Hour (152.5hr)" usd={fmt(r.equivStdBillRate)} className="row-even" />
            <Row label="Equiv — Productive Hour (128hr)" usd={fmt(r.equivProdRate)} />

            <SubHeader label="▸ Deal Revenue Summary" />
            <Row label="Monthly agent revenue" usd={fmt(r.monthlyAgentRev, 'usd', 0)} />
            <Row label="Monthly QA revenue" usd={fmt(r.monthlyQARev, 'usd', 0)} className="row-even" />
            <Row label="Monthly TL revenue" usd={fmt(r.monthlyTLRev, 'usd', 0)} />
            <TotalRow label="  Total monthly revenue" usd={fmt(r.totalMonthlyRev, 'usd', 0)} />
            <Row label="Total annual revenue" usd={fmt(r.totalAnnualRev, 'usd', 0)} className="row-even" />
            <Row label="Monthly direct delivery cost" usd={fmt(r.monthlyCost, 'usd', 0)} />
            <Row label="Monthly gross profit" usd={fmt(r.monthlyGP, 'usd', 0)} className="row-even" />
            <TotalRow label="  Annual gross profit" usd={fmt(r.annualGP, 'usd', 0)} />

            <SubHeader label="▸ FX Sensitivity" />
            <Row label="Gross margin at current FX" pct={fmt(r.grossMarginPct, 'pct')} note="Base case" />
            <Row label="Gross margin at +10% (favourable)" pct={fmt(r.gmAtPlusTen, 'pct')} className="row-even" />
            <Row label="Gross margin at -10% (adverse ⚠)" pct={fmt(r.gmAtMinusTen, 'pct')} className="bg-red-50" />

            <SubHeader label="▸ KPI Metrics" />
            <Row label="Revenue per agent (monthly)" usd={fmt(r.revenuePerAgent, 'usd', 0)} />
            <Row label="Internal cost per FTE (monthly)" usd={fmt(r.internalCostPerFTE, 'usd', 0)} className="row-even" />
            <Row label="Total cost per FTE (monthly)" usd={fmt(r.totalCostPerFTE, 'usd', 0)} />
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
        <span>Billing hours: {r.billingHours} hrs/month ({inputs.commercialModel})</span>
        <span>{inputs.geography} · {inputs.serviceType}</span>
      </div>
    </div>
  )
}
