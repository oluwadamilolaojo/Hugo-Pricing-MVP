// lib/calculations.ts
import type { DealInputs, PLResult, Assumptions, Geography, ServiceType } from './types'

export function getBillingHours(inputs: DealInputs, a: Assumptions): number {
  const divKey = inputs.division === 'CX'
    ? (inputs.geography === 'United States' ? 'US CX' : inputs.geography === 'South Africa' ? 'SA CX' : 'Nigeria CX')
    : 'Nigeria AI Ops'
  return a.billingHours[inputs.commercialModel][divKey]
}

export function getFloorRate(inputs: DealInputs, a: Assumptions): number {
  const geo = inputs.geography
  const svc = inputs.serviceType

  // Base floor rate from assumptions (calibrated for scheduled hours)
  let baseFloor: number
  if (geo === 'Nigeria') {
    baseFloor = a.floorRates.Nigeria[svc] ?? 12
  } else if (geo === 'South Africa') {
    const saMap: Record<string, string> = {
      'Voice CX': 'Voice CX', 'Non-Voice CX': 'Non-Voice CX',
      'Back Office Standard': 'Back Office Standard',
      'Back Office Specialized T1': 'Back Office Specialized T1',
    }
    baseFloor = a.floorRates['South Africa'][saMap[svc] ?? 'Non-Voice CX'] ?? 14
  } else {
    const usKey = svc === 'Voice CX' ? 'Voice CX' : 'Non-Voice CX'
    baseFloor = a.floorRates['United States'][usKey] ?? 35
  }

  // Adjust floor rate upward for productive hour models
  // Fewer billable hours = higher rate needed to protect the same margin
  const scheduledHrs = getBillingHours({ ...inputs, commercialModel: 'Cost per Scheduled Hour' }, a)
  const actualHrs = getBillingHours(inputs, a)
  return baseFloor * (scheduledHrs / actualHrs)
}

export function getMarginFloor(geo: Geography, a: Assumptions): number {
  return a.marginFloors[geo]
}

function deriveInternalCost(inputs: DealInputs, a: Assumptions, billingHrs: number): {
  agentBase: number; qaAlloc: number; tlAlloc: number; pmAlloc: number; complexityPremium: number
} {
  const { geography: geo, division: div, qaAgentRatio, tlAgentRatio } = inputs
  const ot = a.overtime
  const fx = a.fx

  let agentBase = 0
  let qaAlloc = 0
  let tlAlloc = 0

  if (geo === 'Nigeria') {
    const costs = div === 'CX' ? a.ngCX : a.ngAO
    agentBase = (costs.agentPay + costs.agentGA) * (1 + ot.Nigeria) / (billingHrs * fx.ngn)
    qaAlloc = (costs.qaPay + costs.qaGA) / (qaAgentRatio * billingHrs * fx.ngn)
    tlAlloc = (costs.tlPay + costs.tlGA) / (tlAgentRatio * billingHrs * fx.ngn)
  } else if (geo === 'South Africa') {
    agentBase = (a.sa.agentPay + a.sa.agentGA) * (1 + ot['South Africa']) / (billingHrs * fx.zar)
    // SA QA proxy from NG CX
    qaAlloc = (a.ngCX.qaPay + a.ngCX.qaGA) / (qaAgentRatio * billingHrs * fx.ngn)
    tlAlloc = (a.sa.tlPay + a.sa.tlGA) / (tlAgentRatio * billingHrs * fx.zar)
  } else {
    // US
    agentBase = a.us.agentCost * (1 + ot['United States'])
    qaAlloc = 0 // absorbed
    tlAlloc = a.us.tlCost / tlAgentRatio
  }

  // PM / SPM / Leadership (Nigeria CX proxy for all geos)
  const { pm: pmR, spm: spmR, ldr: ldrR } = a.loadingRatios
  const pmAlloc =
    (a.ngCX.pmPay + a.ngCX.pmGA) / (pmR * billingHrs * fx.ngn) +
    a.ngCX.spmUSD / (spmR * billingHrs) +
    a.ngCX.ldrUSD / (ldrR * billingHrs)

  // Complexity premium
  const bakedIn = a.complexity.standard.bakedIn
  let complexityPremium = 0
  if (inputs.complexityTier === 'Intermediate') complexityPremium = bakedIn
  else if (inputs.complexityTier === 'High') complexityPremium = bakedIn * 2

  return { agentBase, qaAlloc, tlAlloc, pmAlloc, complexityPremium }
}

export function calculatePL(inputs: DealInputs, a: Assumptions, useRate: 'floor' | 'proposed'): PLResult {
  const billingHrs = getBillingHours(inputs, a)
  const floorRate = getFloorRate(inputs, a)
  const rate = useRate === 'floor' ? floorRate : inputs.proposedRate

  // Internal cost
  const { agentBase, qaAlloc, tlAlloc, pmAlloc, complexityPremium } = deriveInternalCost(inputs, a, billingHrs)
  const totalInternalCost = agentBase + qaAlloc + tlAlloc + pmAlloc + complexityPremium

  // Premiums
  const p = a.premiums
  const devicePremium = inputs.deviceType === 'Apple MacBook' ? p.macBook : 0
  const infraPremium = inputs.workingLocation === 'In-Office' ? p.inOffice : inputs.workingLocation === 'Clean Room' ? p.cleanRoom : 0
  const shiftPremium =
    inputs.shiftType === 'Double Day' ? totalInternalCost * p.doubleDay :
    inputs.shiftType === 'All Day / 24-7' ? totalInternalCost * p.allDay : 0
  const rp = a.rolePremiums
  const bufferCost =
    ((inputs.agentBuffers * totalInternalCost +
      inputs.qaBuffers * totalInternalCost * (1 + rp.qa) +
      inputs.tlBuffers * totalInternalCost * (1 + rp.tl)) /
      Math.max(inputs.billableAgents, 1)) * (1 + p.bufferMargin)
  const weekendPremium = inputs.weekendCoverage
    ? (inputs.weekendAgents / Math.max(inputs.billableAgents, 1)) * totalInternalCost * p.weekend
    : 0
  const totalPremiums = devicePremium + infraPremium + shiftPremium + bufferCost + weekendPremium
  const totalDirectCost = totalInternalCost + totalPremiums

  // P&L
  const operatingRevenue = rate
  const revenueReduction = -rate * inputs.revenueReduction
  const netRevenue = rate * (1 - inputs.revenueReduction)
  const grossMarginUSD = netRevenue - totalDirectCost
  const grossMarginPct = netRevenue > 0 ? grossMarginUSD / netRevenue : 0
  const marginFloor = getMarginFloor(inputs.geography, a)
  const investmentCaseRequired = grossMarginPct < marginFloor

  // One-off amortized
  const oneOffTotal = inputs.recruitmentCost + inputs.setupCost + inputs.otherOneOffCost
  const oneOffAmortized = -(oneOffTotal / (Math.max(inputs.dealDuration, 1) * billingHrs * Math.max(inputs.billableAgents, 1)))
  const gmAdjustedUSD = grossMarginUSD + oneOffAmortized
  const gmAdjustedPct = netRevenue > 0 ? gmAdjustedUSD / netRevenue : 0

  // Revenue summary
  const monthlyAgentRev = rate * billingHrs * inputs.billableAgents
  const monthlyQARev = rate * (1 + rp.qa) * billingHrs * inputs.billableQAs
  const monthlyTLRev = rate * (1 + rp.tl) * billingHrs * inputs.billableTLs
  const totalMonthlyRev = monthlyAgentRev + monthlyQARev + monthlyTLRev
  const totalAnnualRev = totalMonthlyRev * inputs.dealDuration
  const monthlyCost = totalDirectCost * billingHrs * inputs.billableAgents
  const monthlyGP = totalMonthlyRev - monthlyCost
  const annualGP = monthlyGP * inputs.dealDuration

  // Billing frameworks
  const monthlyRevHugo = rate * billingHrs * inputs.billableAgents
  const agents = Math.max(inputs.billableAgents, 1)
  const equivPayrollRate = monthlyRevHugo / (173.3 * agents)
  const equivStdBillRate = monthlyRevHugo / (152.5 * agents)
  const equivProdRate = monthlyRevHugo / (128.0 * agents)

  // Split/combined rates
  const agentRate = rate
  const qaRate = rate * (1 + rp.qa)
  const tlRate = rate * (1 + rp.tl)
  const combinedMonthlyRev = rate * billingHrs * (inputs.billableAgents + inputs.billableQAs + inputs.billableTLs)
  const splitMonthlyRev = agentRate * billingHrs * inputs.billableAgents + qaRate * billingHrs * inputs.billableQAs + tlRate * billingHrs * inputs.billableTLs

  // FX sensitivity
  const gmAtPlusTen = (rate * 1.1 - totalDirectCost) / (rate * 1.1)
  const gmAtMinusTen = (rate * 0.9 - totalDirectCost) / (rate * 0.9)

  // KPIs
  const revenuePerAgent = totalMonthlyRev / agents
  const internalCostPerFTE = totalInternalCost * billingHrs
  const totalCostPerFTE = totalDirectCost * billingHrs

  return {
    agentBaseCost: agentBase, qaCostAlloc: qaAlloc, tlCostAlloc: tlAlloc,
    pmAlloc, complexityPremium, totalInternalCost,
    devicePremium, infraPremium, shiftPremium, bufferCost, weekendPremium,
    totalPremiums, totalDirectCost,
    operatingRevenue, revenueReduction, netRevenue,
    grossMarginUSD, grossMarginPct, marginFloor, investmentCaseRequired,
    oneOffAmortized, gmAdjustedUSD, gmAdjustedPct,
    monthlyRevHugo, equivPayrollRate, equivStdBillRate, equivProdRate,
    monthlyAgentRev, monthlyQARev, monthlyTLRev, totalMonthlyRev,
    totalAnnualRev, monthlyCost, monthlyGP, annualGP,
    agentRate, qaRate, tlRate, combinedMonthlyRev, splitMonthlyRev,
    gmAtPlusTen, gmAtMinusTen,
    revenuePerAgent, internalCostPerFTE, totalCostPerFTE,
    billingHours: billingHrs, floorRate,
  }
}

export function fmt(n: number, type: 'usd' | 'pct' | 'num' = 'usd', decimals = 2): string {
  if (type === 'pct') return `${(n * 100).toFixed(1)}%`
  if (type === 'num') return n.toLocaleString(undefined, { maximumFractionDigits: decimals })
  const abs = Math.abs(n)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return n < 0 ? `-$${str}` : `$${str}`
}
