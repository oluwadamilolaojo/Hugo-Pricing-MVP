'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { AdminGuard } from '@/components/AuthGuard'
import { loadAssumptions, saveAssumptions, DEFAULT_ASSUMPTIONS } from '@/lib/assumptions'
import type { Assumptions } from '@/lib/types'

function Section({ title, children, defaultOpen=false }: { title:string; children:React.ReactNode; defaultOpen?:boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden">
      <button onClick={()=>setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-cream-200/50 transition-colors">
        <span className="font-medium text-hugo-black text-sm">{title}</span>
        <span className="text-hugo-muted text-lg leading-none">{open?'−':'+'}</span>
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-cream-300 space-y-4">{children}</div>}
    </div>
  )
}

function NumInput({value,onChange,step=1,prefix}:{value:number;onChange:(v:number)=>void;step?:number;prefix?:string}) {
  return (
    <div className="relative">
      {prefix&&<span className="absolute left-3 top-2 text-hugo-muted text-sm">{prefix}</span>}
      <input type="number" step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        className={`hugo-input ${prefix?'pl-7':''}`} />
    </div>
  )
}

function Field({label,note,children}:{label:string;note?:string;children:React.ReactNode}) {
  return (
    <div>
      <div className="field-label">{label}{note&&<span className="text-hugo-muted font-normal ml-1 normal-case tracking-normal">({note})</span>}</div>
      {children}
    </div>
  )
}

function PendingNote({text}:{text:string}) {
  return <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-700 mb-3">{text}</div>
}
function DangerNote({text}:{text:string}) {
  return <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[10px] text-red-700 mb-3">{text}</div>
}

export default function SettingsPage() {
  const [a, setA] = useState<Assumptions|null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(()=>{ setA(loadAssumptions()) },[])

  const update = (path:string[], value:unknown) => {
    setA(prev => {
      if(!prev) return prev
      const next = JSON.parse(JSON.stringify(prev)) as Assumptions
      let cur = next as unknown as Record<string,unknown>
      for(let i=0;i<path.length-1;i++) cur = cur[path[i]] as Record<string,unknown>
      cur[path[path.length-1]] = value
      return next
    })
  }

  const handleSave = () => { if(!a)return; saveAssumptions(a); setSaved(true); setTimeout(()=>setSaved(false),2500) }
  const handleReset = () => setA(JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS)))

  if(!a) return <div className="min-h-screen bg-cream-100 flex items-center justify-center"><span className="font-serif text-xl text-hugo-black">Loading…</span></div>

  return (
    <AdminGuard>
    <div className="min-h-screen bg-cream-100">
      <Nav />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-[32px] text-hugo-black leading-tight">Assumptions</h1>
            <p className="text-[12px] text-hugo-muted mt-1">Finance-owned values. Changes apply to all future calculations.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="btn-ghost text-sm">Reset defaults</button>
            <button onClick={handleSave}
              className="bg-hugo-black text-cream-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-hugo-dark transition-colors">
              {saved ? 'Saved ✓' : 'Save changes'}
            </button>
          </div>
        </div>

        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm text-center py-2.5 rounded-xl mb-5 font-medium">
            Assumptions saved successfully.
          </div>
        )}

        <div className="space-y-3">
          <Section title="Approval & notification" defaultOpen>
            <Field label="Approver email" note="receives submission notifications">
              <input className="hugo-input" type="email" value={a.approverEmail} onChange={e=>update(['approverEmail'],e.target.value)} placeholder="approver@hugo.com" />
            </Field>
            <Field label="Approval window (hours)" note="overdue alert fires after this">
              <NumInput value={a.approvalWindowHours} onChange={v=>update(['approvalWindowHours'],v)} step={1} />
            </Field>
          </Section>

          <Section title="I. FX rates  (update first Monday of each month)">
            <PendingNote text="⚠ Update monthly. Owner: Kiran. Naira appreciation is primary margin risk." />
            <div className="grid grid-cols-3 gap-4">
              <Field label="USD to NGN"><NumInput value={a.fx.ngn} onChange={v=>update(['fx','ngn'],v)} step={10} /></Field>
              <Field label="USD to ZAR"><NumInput value={a.fx.zar} onChange={v=>update(['fx','zar'],v)} step={0.1} /></Field>
              <Field label="FX sensitivity band (%)"><NumInput value={a.fx.band*100} onChange={v=>update(['fx','band'],v/100)} step={1} /></Field>
            </div>
          </Section>

          <Section title="L. Margin floors  (investment case trigger)">
            <DangerNote text="⚠ All pending. US floor likely needs upward revision (Gareth: 20% = breakeven after overheads). Owner: Kiran + Ori." />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nigeria (%)"><NumInput value={a.marginFloors.Nigeria*100} onChange={v=>update(['marginFloors','Nigeria'],v/100)} step={1} /></Field>
              <Field label="South Africa (%)"><NumInput value={a.marginFloors['South Africa']*100} onChange={v=>update(['marginFloors','South Africa'],v/100)} step={1} /></Field>
              <Field label="United States (%)"><NumInput value={a.marginFloors['United States']*100} onChange={v=>update(['marginFloors','United States'],v/100)} step={1} /></Field>
            </div>
          </Section>

          <Section title="A. Billing hours  (per commercial model)">
            <PendingNote text="⚠ All pending Gareth confirmation. Numbers differ by geography. Current placeholders: 173.3 / 152.5 / 128 globally." />
            {(['Cost per Scheduled Hour','Cost per Productive Hour','Full Productive Hour'] as const).map(model=>(
              <div key={model} className="mb-4">
                <div className="field-label mb-2">{model}</div>
                <div className="grid grid-cols-4 gap-3">
                  {(['Nigeria CX','Nigeria AI Ops','SA CX','US CX'] as const).map(geo=>(
                    <Field key={geo} label={geo}>
                      <NumInput value={a.billingHours[model][geo]} onChange={v=>update(['billingHours',model,geo],v)} step={0.1} />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          <Section title="B. Nigeria CX — role costs (NGN/month)">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(a.ngCX).filter(([k])=>!k.includes('USD')).map(([key,val])=>(
                <Field key={key} label={key}><NumInput value={val as number} onChange={v=>update(['ngCX',key],v)} step={1000} /></Field>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cream-300">
              <Field label="SPM USD/month"><NumInput value={a.ngCX.spmUSD} onChange={v=>update(['ngCX','spmUSD'],v)} step={100} prefix="$" /></Field>
              <Field label="Ops Head USD/month"><NumInput value={a.ngCX.ldrUSD} onChange={v=>update(['ngCX','ldrUSD'],v)} step={100} prefix="$" /></Field>
            </div>
          </Section>

          <Section title="D. South Africa — role costs (ZAR/month)">
            <PendingNote text="G&A proxied from Nigeria ratio. Kiran to confirm SA-specific G&A." />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agent base pay"><NumInput value={a.sa.agentPay} onChange={v=>update(['sa','agentPay'],v)} step={500} /></Field>
              <Field label="Agent G&A (proxy)"><NumInput value={a.sa.agentGA} onChange={v=>update(['sa','agentGA'],v)} step={500} /></Field>
              <Field label="TL base pay"><NumInput value={a.sa.tlPay} onChange={v=>update(['sa','tlPay'],v)} step={500} /></Field>
              <Field label="TL G&A (proxy)"><NumInput value={a.sa.tlGA} onChange={v=>update(['sa','tlGA'],v)} step={500} /></Field>
            </div>
          </Section>

          <Section title="E. United States — role costs (USD/hr, Missouri)">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agent cost (USD/hr)"><NumInput value={a.us.agentCost} onChange={v=>update(['us','agentCost'],v)} step={0.5} prefix="$" /></Field>
              <Field label="TL cost (USD/hr)"><NumInput value={a.us.tlCost} onChange={v=>update(['us','tlCost'],v)} step={0.5} prefix="$" /></Field>
            </div>
          </Section>

          <Section title="G. Client floor rates (USD/hr)">
            <PendingNote text="⚠ Pending Gareth revised matrix. Floor rates should also vary by commercial model (v2)." />
            <div className="mb-3">
              <div className="field-label mb-2">Nigeria</div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(a.floorRates.Nigeria).map(([svc,rate])=>(
                  <Field key={svc} label={svc.replace('Back Office ','BO ')}><NumInput value={rate as number} onChange={v=>update(['floorRates','Nigeria',svc],v)} step={0.5} prefix="$" /></Field>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <div className="field-label mb-2">South Africa</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(a.floorRates['South Africa']).map(([svc,rate])=>(
                  <Field key={svc} label={svc}><NumInput value={rate as number} onChange={v=>update(['floorRates','South Africa',svc],v)} step={0.5} prefix="$" /></Field>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label mb-2">United States</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(a.floorRates['United States']).map(([svc,rate])=>(
                  <Field key={svc} label={svc}><NumInput value={rate as number} onChange={v=>update(['floorRates','United States',svc],v)} step={1} prefix="$" /></Field>
                ))}
              </div>
            </div>
          </Section>

          <Section title="J. Delivery premiums">
            <div className="grid grid-cols-3 gap-4">
              <Field label="MacBook premium ($/hr)"><NumInput value={a.premiums.macBook} onChange={v=>update(['premiums','macBook'],v)} step={0.01} prefix="$" /></Field>
              <Field label="In-Office premium ($/hr)"><NumInput value={a.premiums.inOffice} onChange={v=>update(['premiums','inOffice'],v)} step={0.01} prefix="$" /></Field>
              <Field label="Clean Room premium ($/hr)"><NumInput value={a.premiums.cleanRoom} onChange={v=>update(['premiums','cleanRoom'],v)} step={0.01} prefix="$" /></Field>
              <Field label="Double Day shift (%)"><NumInput value={a.premiums.doubleDay*100} onChange={v=>update(['premiums','doubleDay'],v/100)} step={1} /></Field>
              <Field label="All Day / 24-7 shift (%)"><NumInput value={a.premiums.allDay*100} onChange={v=>update(['premiums','allDay'],v/100)} step={1} /></Field>
              <Field label="Weekend premium (%)"><NumInput value={a.premiums.weekend*100} onChange={v=>update(['premiums','weekend'],v/100)} step={1} /></Field>
              <Field label="Buffer cost margin (%)"><NumInput value={a.premiums.bufferMargin*100} onChange={v=>update(['premiums','bufferMargin'],v/100)} step={5} /></Field>
            </div>
          </Section>

          <Section title="M. Support & overhead (% of net revenue)">
            <DangerNote text="⚠ All pending Kiran. Gareth: typically ~20%. Derive from last 3–6 months indirect costs ÷ agent count." />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nigeria (%)"><NumInput value={a.overhead.Nigeria*100} onChange={v=>update(['overhead','Nigeria'],v/100)} step={1} /></Field>
              <Field label="South Africa (%)"><NumInput value={a.overhead['South Africa']*100} onChange={v=>update(['overhead','South Africa'],v/100)} step={1} /></Field>
              <Field label="United States (%)"><NumInput value={a.overhead['United States']*100} onChange={v=>update(['overhead','United States'],v/100)} step={1} /></Field>
            </div>
          </Section>

          <Section title="N. Overtime & public holiday gross-up">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nigeria (%)"><NumInput value={a.overtime.Nigeria*100} onChange={v=>update(['overtime','Nigeria'],v/100)} step={0.1} /></Field>
              <Field label="South Africa (%)"><NumInput value={a.overtime['South Africa']*100} onChange={v=>update(['overtime','South Africa'],v/100)} step={0.1} /></Field>
              <Field label="United States (%)"><NumInput value={a.overtime['United States']*100} onChange={v=>update(['overtime','United States'],v/100)} step={0.1} /></Field>
            </div>
          </Section>

          <Section title="F. Loading ratios  (agents : 1 support role)">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(a.loadingRatios).map(([key,val])=>(
                <Field key={key} label={`${key} ratio`}><NumInput value={val} onChange={v=>update(['loadingRatios',key],v)} step={5} /></Field>
              ))}
            </div>
          </Section>

          <Section title="P. Role rate premiums">
            <div className="grid grid-cols-2 gap-4">
              <Field label="QA premium (%)"><NumInput value={a.rolePremiums.qa*100} onChange={v=>update(['rolePremiums','qa'],v/100)} step={1} /></Field>
              <Field label="TL premium (%)"><NumInput value={a.rolePremiums.tl*100} onChange={v=>update(['rolePremiums','tl'],v/100)} step={1} /></Field>
            </div>
          </Section>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={handleReset} className="btn-ghost">Reset to defaults</button>
          <button onClick={handleSave} className="bg-hugo-black text-cream-100 px-5 py-2 rounded-lg text-sm font-medium hover:bg-hugo-dark transition-colors">
            {saved ? 'Saved ✓' : 'Save all changes'}
          </button>
        </div>
      </div>
    </div>
    </AdminGuard>
  )
}
