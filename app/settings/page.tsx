'use client'
// app/settings/page.tsx
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { loadAssumptions, saveAssumptions, DEFAULT_ASSUMPTIONS } from '@/lib/assumptions'
import type { Assumptions } from '@/lib/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full bg-navy-600 text-white text-sm font-bold px-5 py-3 flex items-center justify-between hover:bg-navy-700 transition-colors">
        <span>{title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  )
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{note && <span className="text-gray-400 font-normal ml-1">({note})</span>}</label>
      {children}
    </div>
  )
}

function NumInput({ value, onChange, step = 1, prefix }: { value: number; onChange: (v: number) => void; step?: number; prefix?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-2 text-gray-400 text-sm">{prefix}</span>}
      <input type="number" step={step} value={value} onChange={e => onChange(parseFloat(e.target.value)||0)}
        className={`input-field ${prefix ? 'pl-7' : ''}`} />
    </div>
  )
}

export default function SettingsPage() {
  const [a, setA] = useState<Assumptions | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setA(loadAssumptions()) }, [])

  const update = (path: string[], value: unknown) => {
    setA(prev => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev)) as Assumptions
      let cur: Record<string, unknown> = next as unknown as Record<string,unknown>
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string,unknown>
      cur[path[path.length - 1]] = value
      return next
    })
  }

  const handleSave = () => {
    if (!a) return
    saveAssumptions(a)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    setA(JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS)))
  }

  if (!a) return <div className="flex items-center justify-center h-screen text-gray-500">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-700">Assumptions & Settings</h1>
            <p className="text-gray-500 text-sm">Changes here update all future calculations. Finance-owned values are highlighted.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="btn-secondary text-sm">↩ Reset defaults</button>
            <button onClick={handleSave} className="btn-primary text-sm">{saved ? '✓ Saved!' : '💾 Save changes'}</button>
          </div>
        </div>

        {saved && (
          <div className="bg-green-100 text-green-800 text-sm text-center py-2 rounded-lg mb-4 font-medium">
            ✓ Assumptions saved successfully
          </div>
        )}

        <div className="space-y-3">
          {/* Approval Settings */}
          <Section title="⚙  Approval & Notification Settings">
            <Field label="Approver email" note="receives notification when deal is submitted">
              <input className="input-field" type="email" value={a.approverEmail} onChange={e => update(['approverEmail'], e.target.value)} placeholder="approver@hugo.com" />
            </Field>
            <Field label="Approval window (hours)" note="overdue alert fires after this window">
              <NumInput value={a.approvalWindowHours} onChange={v => update(['approvalWindowHours'], v)} step={1} />
            </Field>
          </Section>

          {/* FX Rates */}
          <Section title="I.  FX Rates  (update first Monday of each month)">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
              ⚠ Yellow cells — pending Finance validation. Update on the first Monday of each month. Owner: Kiran.
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="USD to NGN"><NumInput value={a.fx.ngn} onChange={v => update(['fx','ngn'],v)} step={10} /></Field>
              <Field label="USD to ZAR"><NumInput value={a.fx.zar} onChange={v => update(['fx','zar'],v)} step={0.1} /></Field>
              <Field label="FX sensitivity band (%)"><NumInput value={a.fx.band*100} onChange={v => update(['fx','band'],v/100)} step={1} /></Field>
            </div>
          </Section>

          {/* Margin Floors */}
          <Section title="L.  Margin Floors  (Investment case trigger — Owner: Kiran + Ori)">
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">
              ⚠ All pending confirmation. US floor flagged — Gareth: 20% likely means breakeven after overheads. Needs upward revision.
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nigeria floor (%)"><NumInput value={a.marginFloors.Nigeria*100} onChange={v => update(['marginFloors','Nigeria'],v/100)} step={1} /></Field>
              <Field label="South Africa floor (%)"><NumInput value={a.marginFloors['South Africa']*100} onChange={v => update(['marginFloors','South Africa'],v/100)} step={1} /></Field>
              <Field label="United States floor (%)"><NumInput value={a.marginFloors['United States']*100} onChange={v => update(['marginFloors','United States'],v/100)} step={1} /></Field>
            </div>
          </Section>

          {/* Billing Hours */}
          <Section title="A.  Billing Hours (hrs/month by commercial model)">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
              ⚠ All pending Gareth confirmation. Numbers differ by geography due to labour laws. Placeholder: 173.3 / 152.5 / 128 globally.
            </div>
            {(['Cost per Scheduled Hour','Cost per Productive Hour','Full Productive Hour'] as const).map(model => (
              <div key={model}>
                <p className="text-xs font-bold text-gray-600 mb-2">{model}</p>
                <div className="grid grid-cols-4 gap-3">
                  {(['Nigeria CX','Nigeria AI Ops','SA CX','US CX'] as const).map(geo => (
                    <Field key={geo} label={geo}>
                      <NumInput value={a.billingHours[model][geo]} onChange={v => update(['billingHours',model,geo],v)} step={0.1} />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          {/* Nigeria CX costs */}
          <Section title="B.  Nigeria CX — Role Costs (NGN/month)">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(a.ngCX).filter(([k]) => !k.includes('USD')).map(([key, val]) => (
                <Field key={key} label={key}><NumInput value={val as number} onChange={v => update(['ngCX',key],v)} step={1000} /></Field>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
              <Field label="SPM — USD/month"><NumInput value={a.ngCX.spmUSD} onChange={v => update(['ngCX','spmUSD'],v)} step={100} prefix="$" /></Field>
              <Field label="Ops Head — USD/month"><NumInput value={a.ngCX.ldrUSD} onChange={v => update(['ngCX','ldrUSD'],v)} step={100} prefix="$" /></Field>
            </div>
          </Section>

          {/* SA costs */}
          <Section title="D.  South Africa — Role Costs (ZAR/month, Hugo SA)">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
              G&A proxied from Nigeria ratio. Kiran to confirm SA-specific G&A.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agent base pay"><NumInput value={a.sa.agentPay} onChange={v => update(['sa','agentPay'],v)} step={500} /></Field>
              <Field label="Agent G&A (proxy)"><NumInput value={a.sa.agentGA} onChange={v => update(['sa','agentGA'],v)} step={500} /></Field>
              <Field label="TL base pay"><NumInput value={a.sa.tlPay} onChange={v => update(['sa','tlPay'],v)} step={500} /></Field>
              <Field label="TL G&A (proxy)"><NumInput value={a.sa.tlGA} onChange={v => update(['sa','tlGA'],v)} step={500} /></Field>
            </div>
          </Section>

          {/* US costs */}
          <Section title="E.  United States — Role Costs (USD/hr, Missouri)">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agent cost (USD/hr)"><NumInput value={a.us.agentCost} onChange={v => update(['us','agentCost'],v)} step={0.5} prefix="$" /></Field>
              <Field label="TL cost (USD/hr)"><NumInput value={a.us.tlCost} onChange={v => update(['us','tlCost'],v)} step={0.5} prefix="$" /></Field>
            </div>
          </Section>

          {/* Floor rates */}
          <Section title="G.  Client Floor Rates (USD/hr)">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
              ⚠ Pending Gareth revised matrix. Floor rates should also vary by commercial model (v2).
            </div>
            <p className="text-xs font-bold text-gray-600 mb-2">Nigeria</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(a.floorRates.Nigeria).map(([svc, rate]) => (
                <Field key={svc} label={svc}>
                  <NumInput value={rate as number} onChange={v => update(['floorRates','Nigeria',svc],v)} step={0.5} prefix="$" />
                </Field>
              ))}
            </div>
            <p className="text-xs font-bold text-gray-600 mt-4 mb-2">South Africa</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(a.floorRates['South Africa']).map(([svc, rate]) => (
                <Field key={svc} label={svc}>
                  <NumInput value={rate as number} onChange={v => update(['floorRates','South Africa',svc],v)} step={0.5} prefix="$" />
                </Field>
              ))}
            </div>
            <p className="text-xs font-bold text-gray-600 mt-4 mb-2">United States</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(a.floorRates['United States']).map(([svc, rate]) => (
                <Field key={svc} label={svc}>
                  <NumInput value={rate as number} onChange={v => update(['floorRates','United States',svc],v)} step={1} prefix="$" />
                </Field>
              ))}
            </div>
          </Section>

          {/* Delivery premiums */}
          <Section title="J.  Delivery Premiums">
            <div className="grid grid-cols-3 gap-4">
              <Field label="MacBook premium (USD/hr)"><NumInput value={a.premiums.macBook} onChange={v => update(['premiums','macBook'],v)} step={0.01} prefix="$" /></Field>
              <Field label="In-Office premium (USD/hr)"><NumInput value={a.premiums.inOffice} onChange={v => update(['premiums','inOffice'],v)} step={0.01} prefix="$" /></Field>
              <Field label="Clean Room premium (USD/hr)"><NumInput value={a.premiums.cleanRoom} onChange={v => update(['premiums','cleanRoom'],v)} step={0.01} prefix="$" /></Field>
              <Field label="Double Day shift (%)"><NumInput value={a.premiums.doubleDay*100} onChange={v => update(['premiums','doubleDay'],v/100)} step={1} /></Field>
              <Field label="All Day / 24-7 shift (%)"><NumInput value={a.premiums.allDay*100} onChange={v => update(['premiums','allDay'],v/100)} step={1} /></Field>
              <Field label="Weekend premium (%)"><NumInput value={a.premiums.weekend*100} onChange={v => update(['premiums','weekend'],v/100)} step={1} /></Field>
              <Field label="Buffer cost margin (%)"><NumInput value={a.premiums.bufferMargin*100} onChange={v => update(['premiums','bufferMargin'],v/100)} step={5} /></Field>
            </div>
          </Section>

          {/* Overhead */}
          <Section title="M.  Support & Overhead (% of net revenue — Owner: Kiran)">
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">
              ⚠ All pending Kiran validation. Gareth: typically ~20%. Take last 3–6 months indirect costs ÷ agent count.
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nigeria overhead (%)"><NumInput value={a.overhead.Nigeria*100} onChange={v => update(['overhead','Nigeria'],v/100)} step={1} /></Field>
              <Field label="South Africa overhead (%)"><NumInput value={a.overhead['South Africa']*100} onChange={v => update(['overhead','South Africa'],v/100)} step={1} /></Field>
              <Field label="United States overhead (%)"><NumInput value={a.overhead['United States']*100} onChange={v => update(['overhead','United States'],v/100)} step={1} /></Field>
            </div>
          </Section>

          {/* Overtime */}
          <Section title="N.  Overtime & Public Holiday Gross-up (% uplift on agent pay)">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nigeria (%)"><NumInput value={a.overtime.Nigeria*100} onChange={v => update(['overtime','Nigeria'],v/100)} step={0.1} /></Field>
              <Field label="South Africa (%)"><NumInput value={a.overtime['South Africa']*100} onChange={v => update(['overtime','South Africa'],v/100)} step={0.1} /></Field>
              <Field label="United States (%)"><NumInput value={a.overtime['United States']*100} onChange={v => update(['overtime','United States'],v/100)} step={0.1} /></Field>
            </div>
          </Section>

          {/* Loading ratios */}
          <Section title="F.  Staffing Loading Ratios (agents : 1 support role)">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(a.loadingRatios).map(([key, val]) => (
                <Field key={key} label={`${key} ratio`}><NumInput value={val} onChange={v => update(['loadingRatios',key],v)} step={5} /></Field>
              ))}
            </div>
          </Section>

          {/* Role premiums */}
          <Section title="P.  Role Rate Premiums (used in split rate output)">
            <div className="grid grid-cols-2 gap-4">
              <Field label="QA rate premium (%)"><NumInput value={a.rolePremiums.qa*100} onChange={v => update(['rolePremiums','qa'],v/100)} step={1} /></Field>
              <Field label="TL rate premium (%)"><NumInput value={a.rolePremiums.tl*100} onChange={v => update(['rolePremiums','tl'],v/100)} step={1} /></Field>
            </div>
          </Section>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={handleReset} className="btn-secondary">↩ Reset to defaults</button>
          <button onClick={handleSave} className="btn-primary">{saved ? '✓ Saved!' : '💾 Save all changes'}</button>
        </div>
      </div>
    </div>
  )
}
