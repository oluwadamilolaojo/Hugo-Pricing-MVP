# Hugo Pricing Calculator

Internal pricing and margin calculator for Hugo. Built with Next.js, deployable to Vercel in under 10 minutes.

## What it does

- **Calculator** — Deal inputs → dual P&L output (Floor Rate + Proposed Rate side by side). Real-time calculation. Investment case auto-triggers when proposed margin is below floor.
- **Approval flow** — Submit a deal for review. Reviewer approves or rejects with notes. Email notifications on submission, approval, and rejection.
- **Escalation** — Deals not reviewed within the configured window are marked overdue and trigger a reminder email.
- **Deal Log** — Full audit trail of all deals with CSV export (one deal or all).
- **Settings** — All assumptions editable under Settings → Assumptions (FX rates, margin floors, billing hours, role costs, premiums, etc.)

## Deploy to Vercel (10 minutes)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Hugo Pricing Calculator v1"
gh repo create hugo-pricing-calculator --private --source=. --push
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Framework: Next.js (auto-detected)
3. Click Deploy

### 3. Configure email notifications (5 minutes)

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Go to API Keys → Create API Key
3. In Vercel: Project Settings → Environment Variables → add:
   - `RESEND_API_KEY` = your key from Resend
   - `FROM_EMAIL` = `Hugo Pricing <noreply@resend.dev>` (or your domain once verified)
   - `NEXT_PUBLIC_BASE_URL` = `https://your-app.vercel.app`
4. Redeploy for env vars to take effect
5. In the app: Settings → Approval & Notification Settings → enter the approver's email

### 4. Optional: Shared storage across users

By default, deals are stored in localStorage — they're only visible on the device that submitted them. For shared access:

1. Sign up at [upstash.com](https://upstash.com) → Create Database (free tier)
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from your database dashboard
3. Add both to Vercel environment variables
4. Update `lib/storage.ts` to use the Redis client (upgrade path is stubbed in `app/api/deals/route.ts`)

## Local development

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
# Open http://localhost:3000
```

## How the approval flow works

1. Salesperson completes the calculator and clicks **Submit for Approval**
2. If the proposed margin is below the floor, an investment case justification is required before submission
3. The deal is saved with status `pending_review`
4. Approver receives an email notification with a link to the Deal Log
5. Approver clicks **Review** on the deal, adds notes, and approves or rejects
6. Submitter receives an email with the decision
7. If the deal is not reviewed within the approval window (default 24hrs), it is marked `overdue` and a reminder email is sent

For the test version, the same person can submit and approve (single-user mode).

## Architecture

```
app/
  calculator/     — Main deal input form + dual P&L output
  deals/          — Deal log with approval workflow
  settings/       — Assumptions editor
  api/notify/     — Email notification (Resend)
  api/deals/      — Server-side storage stub (upgrade path)
lib/
  types.ts        — TypeScript interfaces
  assumptions.ts  — Default values + localStorage persistence
  calculations.ts — All pricing math (matches the spreadsheet exactly)
  storage.ts      — Deal CRUD + CSV export
components/
  Nav.tsx         — Top navigation
  PLPanel.tsx     — P&L output table (used in both floor and proposed views)
```

## Calculation logic

All calculations mirror the v5 spreadsheet (`Hugo_Pricing_Calculator_v5.xlsx`). Key formula:

**Internal cost per agent/hr:**
```
agentBaseCost = (agentPay + agentGA) × (1 + overtimeGrossUp) ÷ (billingHours × FXRate)
totalInternalCost = agentBase + qaAlloc + tlAlloc + pmAlloc + complexityPremium
totalDirectCost = totalInternalCost + allPremiums
grossMargin = (netRevenue - totalDirectCost) / netRevenue
```

**Billing hours** are driven by the Commercial Model × Geography matrix in Settings.
**Floor rate** is auto-calculated from Geography × Service Type in Settings → Floor Rates.

## Updating assumptions

Finance-owned values (FX rates, margin floors, overhead %) are in Settings → Assumptions. Changes take effect immediately and are saved to localStorage. The approver email and escalation window are also configurable there.
