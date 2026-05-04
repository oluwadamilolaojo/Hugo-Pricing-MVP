// lib/assumptions.ts
import type { Assumptions } from './types'

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  billingHours: {
    'Cost per Scheduled Hour': { 'Nigeria CX': 173.3, 'Nigeria AI Ops': 173.3, 'SA CX': 173.3, 'US CX': 173.3 },
    'Cost per Productive Hour': { 'Nigeria CX': 152.5, 'Nigeria AI Ops': 152.5, 'SA CX': 152.5, 'US CX': 152.5 },
    'Full Productive Hour':     { 'Nigeria CX': 128.0, 'Nigeria AI Ops': 128.0, 'SA CX': 128.0, 'US CX': 128.0 },
  },
  workingDays: 21.67,
  ngCX: {
    agentPay: 295000, agentGA: 204000,
    qaPay: 345000,   qaGA: 193000,
    tlPay: 565000,   tlGA: 214000,
    pmPay: 1650000,  pmGA: 380000,
    spmUSD: 4500,    ldrUSD: 16667,
  },
  ngAO: {
    agentPay: 350000, agentGA: 204000,
    qaPay: 420000,   qaGA: 193000,
    tlPay: 650000,   tlGA: 214000,
    pmPay: 2000000,  pmGA: 380000,
  },
  sa: { agentPay: 13500, agentGA: 9315, tlPay: 27500, tlGA: 18975 },
  us: { agentCost: 20, tlCost: 30 },
  loadingRatios: { wfm: 200, trainer: 40, pm: 150, pc: 30, spm: 100, ldr: 500 },
  floorRates: {
    Nigeria: {
      'Non-Voice CX': 12, 'Voice CX': 14, 'Back Office Standard': 12,
      'Back Office Specialized T1': 14, 'Back Office Specialized T2': 20, 'Back Office Specialized T3': 32,
    },
    'South Africa': { 'Non-Voice CX': 14, 'Voice CX': 16, 'Back Office Standard': 14, 'Back Office Specialized T1': 16 },
    'United States': { 'Non-Voice CX': 35, 'Voice CX': 35, 'Team Lead': 45, 'PM/Project Manager': 70 },
  },
  scaleTiers: [0, 0.026, 0.051, 0.077],
  fx: { ngn: 1500, zar: 18.5, band: 0.10 },
  premiums: {
    macBook: 0.14, inOffice: 0.02, cleanRoom: 0.04,
    doubleDay: 0.05, allDay: 0.10, weekend: 0.20, bufferMargin: 1.0,
  },
  complexity: {
    standard:     { pm: 0.025, spm: 0.010, ldr: 0.002, bakedIn: 0.67 },
    intermediate: { pm: 0.050, spm: 0.020, ldr: 0.004 },
    high:         { pm: 0.075, spm: 0.030, ldr: 0.006 },
  },
  marginFloors: { Nigeria: 0.60, 'South Africa': 0.50, 'United States': 0.30 },
  overhead: { Nigeria: 0.20, 'South Africa': 0.20, 'United States': 0.20 },
  overtime: { Nigeria: 0.015, 'South Africa': 0.023, 'United States': 0.020 },
  rolePremiums: { qa: 0.10, tl: 0.20 },
  approvalWindowHours: 24,
  approverEmail: 'oluwadamilola.ojo@hugotech.co',
}

const STORAGE_KEY = 'hugo_assumptions'

export function loadAssumptions(): Assumptions {
  if (typeof window === 'undefined') return DEFAULT_ASSUMPTIONS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_ASSUMPTIONS
    return { ...DEFAULT_ASSUMPTIONS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_ASSUMPTIONS
  }
}

export function saveAssumptions(a: Assumptions): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
}
