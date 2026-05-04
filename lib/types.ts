// lib/types.ts

export type Geography = 'Nigeria' | 'South Africa' | 'United States'
export type Division = 'CX' | 'AI Ops'
export type CommercialModel = 'Cost per Scheduled Hour' | 'Cost per Productive Hour' | 'Full Productive Hour'
export type ServiceType =
  | 'Non-Voice CX'
  | 'Voice CX'
  | 'Back Office Standard'
  | 'Back Office Specialized T1'
  | 'Back Office Specialized T2'
  | 'Back Office Specialized T3'
export type ComplexityTier = 'Standard' | 'Intermediate' | 'High'
export type ShiftType = 'Single (9-5)' | 'Double Day' | 'All Day / 24-7'
export type DeviceType = 'Lenovo (standard)' | 'Apple MacBook'
export type WorkingLocation = 'Remote' | 'In-Office' | 'Clean Room'
export type RatePresentation = 'Combined' | 'Split'
export type DealStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'overdue'

export interface DealInputs {
  // Deal basics
  clientName: string
  salesperson: string
  salespersonEmail: string
  dateOfPricing: string
  geography: Geography
  division: Division
  commercialModel: CommercialModel
  serviceType: ServiceType
  complexityTier: ComplexityTier
  dealDuration: number
  // Team configuration
  billableAgents: number
  billableQAs: number
  billableTLs: number
  qaAgentRatio: number
  tlAgentRatio: number
  agentBuffers: number
  qaBuffers: number
  tlBuffers: number
  // Operating hours
  weeklyHours: number
  shiftType: ShiftType
  weekendCoverage: boolean
  weekendAgents: number
  // Infrastructure
  deviceType: DeviceType
  workingLocation: WorkingLocation
  // Pricing
  proposedRate: number
  revenueReduction: number
  fxRate: number
  ratePresentation: RatePresentation
  // One-off costs
  recruitmentCost: number
  setupCost: number
  otherOneOffCost: number
}

export interface PLResult {
  // Internal cost derivation
  agentBaseCost: number
  qaCostAlloc: number
  tlCostAlloc: number
  pmAlloc: number
  complexityPremium: number
  totalInternalCost: number
  // Premiums
  devicePremium: number
  infraPremium: number
  shiftPremium: number
  bufferCost: number
  weekendPremium: number
  totalPremiums: number
  totalDirectCost: number
  // P&L
  operatingRevenue: number
  revenueReduction: number
  netRevenue: number
  grossMarginUSD: number
  grossMarginPct: number
  marginFloor: number
  investmentCaseRequired: boolean
  // Setup cost adjusted
  oneOffAmortized: number
  gmAdjustedUSD: number
  gmAdjustedPct: number
  // Rate frameworks
  monthlyRevHugo: number
  equivPayrollRate: number
  equivStdBillRate: number
  equivProdRate: number
  // Revenue summary
  monthlyAgentRev: number
  monthlyQARev: number
  monthlyTLRev: number
  totalMonthlyRev: number
  totalAnnualRev: number
  monthlyCost: number
  monthlyGP: number
  annualGP: number
  // Split rates
  agentRate: number
  qaRate: number
  tlRate: number
  combinedMonthlyRev: number
  splitMonthlyRev: number
  // FX sensitivity
  gmAtPlusTen: number
  gmAtMinusTen: number
  // KPIs
  revenuePerAgent: number
  internalCostPerFTE: number
  totalCostPerFTE: number
  // Billing hours used
  billingHours: number
  // Floor rate
  floorRate: number
}

export interface Deal {
  id: string
  inputs: DealInputs
  floorPL: PLResult
  proposedPL: PLResult
  status: DealStatus
  submittedAt: string
  submittedBy: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
  investmentCaseNotes?: string
  escalatedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Assumptions {
  // Billing hours table
  billingHours: {
    [model in CommercialModel]: {
      'Nigeria CX': number
      'Nigeria AI Ops': number
      'SA CX': number
      'US CX': number
    }
  }
  workingDays: number
  // Nigeria CX costs (NGN/month)
  ngCX: {
    agentPay: number; agentGA: number
    qaPay: number; qaGA: number
    tlPay: number; tlGA: number
    pmPay: number; pmGA: number
    spmUSD: number; ldrUSD: number
  }
  // Nigeria AI Ops (NGN/month)
  ngAO: {
    agentPay: number; agentGA: number
    qaPay: number; qaGA: number
    tlPay: number; tlGA: number
    pmPay: number; pmGA: number
  }
  // South Africa (ZAR/month)
  sa: { agentPay: number; agentGA: number; tlPay: number; tlGA: number }
  // US (USD/hr)
  us: { agentCost: number; tlCost: number }
  // Loading ratios
  loadingRatios: { wfm: number; trainer: number; pm: number; pc: number; spm: number; ldr: number }
  // Floor rates (USD/hr)
  floorRates: {
    Nigeria: { [key in ServiceType]?: number }
    'South Africa': { [key: string]: number }
    'United States': { [key: string]: number }
  }
  // Scale tiers
  scaleTiers: [number, number, number, number]
  // FX
  fx: { ngn: number; zar: number; band: number }
  // Premiums
  premiums: {
    macBook: number; inOffice: number; cleanRoom: number
    doubleDay: number; allDay: number; weekend: number; bufferMargin: number
  }
  // Complexity
  complexity: {
    standard: { pm: number; spm: number; ldr: number; bakedIn: number }
    intermediate: { pm: number; spm: number; ldr: number }
    high: { pm: number; spm: number; ldr: number }
  }
  // Margin floors
  marginFloors: { Nigeria: number; 'South Africa': number; 'United States': number }
  // Overhead
  overhead: { Nigeria: number; 'South Africa': number; 'United States': number }
  // Overtime gross-up
  overtime: { Nigeria: number; 'South Africa': number; 'United States': number }
  // Role premiums
  rolePremiums: { qa: number; tl: number }
  // Approval window
  approvalWindowHours: number
  // Approver email
  approverEmail: string
}

export interface AppSettings {
  assumptions: Assumptions
  approverEmail: string
  approvalWindowHours: number
}
