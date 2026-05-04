// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { dealId, type, deal, approverEmail, submitterEmail } = await req.json()

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const FROM_EMAIL = process.env.FROM_EMAIL || 'Hugo Pricing <noreply@resend.dev>'
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-app.vercel.app'

    // Build email content
    const dealUrl = `${BASE_URL}/deals`
    const client = deal?.inputs?.clientName || 'Unknown Client'
    const salesperson = deal?.inputs?.salesperson || 'Unknown'
    const proposedRate = deal?.inputs?.proposedRate ? `$${deal.inputs.proposedRate.toFixed(2)}/hr` : 'N/A'
    const floorRate = deal?.floorPL?.floorRate ? `$${deal.floorPL.floorRate.toFixed(2)}/hr` : 'N/A'
    const gm = deal?.proposedPL?.grossMarginPct ? `${(deal.proposedPL.grossMarginPct * 100).toFixed(1)}%` : 'N/A'
    const isInvCase = deal?.proposedPL?.investmentCaseRequired ? true : false
    const invNotes = deal?.investmentCaseNotes || ''

    let to: string[] = []
    let subject = ''
    let html = ''

    if (type === 'submitted') {
      to = [approverEmail].filter(Boolean)
      subject = `[Action Required] Deal submitted for review: ${client}`
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1F3864;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Hugo Pricing Calculator</h1>
            <p style="color:#D6DCE4;margin:4px 0 0">Deal submitted for review</p>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #e0e0e0;border-top:none">
            <p style="color:#333">A new deal has been submitted and requires your review.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#1F3864;color:white">
                <th style="padding:10px 12px;text-align:left;font-size:13px">Detail</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px">Value</th>
              </tr>
              <tr style="background:white">
                <td style="padding:10px 12px;font-size:13px;color:#555;border-bottom:1px solid #eee">Client</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:bold;border-bottom:1px solid #eee">${client}</td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:10px 12px;font-size:13px;color:#555;border-bottom:1px solid #eee">Submitted by</td>
                <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #eee">${salesperson}</td>
              </tr>
              <tr style="background:white">
                <td style="padding:10px 12px;font-size:13px;color:#555;border-bottom:1px solid #eee">Geography</td>
                <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #eee">${deal?.inputs?.geography || 'N/A'}</td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:10px 12px;font-size:13px;color:#555;border-bottom:1px solid #eee">Floor Rate</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:bold;color:#1F6B63;border-bottom:1px solid #eee">${floorRate}</td>
              </tr>
              <tr style="background:white">
                <td style="padding:10px 12px;font-size:13px;color:#555;border-bottom:1px solid #eee">Proposed Rate</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:bold;color:#1F3864;border-bottom:1px solid #eee">${proposedRate}</td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:10px 12px;font-size:13px;color:#555">Gross Margin</td>
                <td style="padding:10px 12px;font-size:13px;font-weight:bold;color:${isInvCase ? '#C00000' : '#375623'}">${gm}</td>
              </tr>
            </table>
            ${isInvCase ? `
            <div style="background:#FFF2CC;border:1px solid #BF8F00;border-radius:6px;padding:16px;margin:16px 0">
              <p style="color:#BF8F00;font-weight:bold;margin:0 0 8px">⚠ Investment Case Required</p>
              <p style="color:#595959;font-size:13px;margin:0">${invNotes || 'Justification provided at submission.'}</p>
            </div>` : ''}
            <div style="text-align:center;margin:24px 0">
              <a href="${dealUrl}" style="background:#1F3864;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">
                Review Deal →
              </a>
            </div>
            <p style="color:#888;font-size:12px;text-align:center">Deal ID: ${dealId}</p>
          </div>
        </div>`
    } else if (type === 'approved') {
      to = [submitterEmail, deal?.inputs?.salespersonEmail].filter(Boolean)
      subject = `✓ Deal approved: ${client}`
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#375623;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Deal Approved</h1>
            <p style="color:#E2EFDA;margin:4px 0 0">${client}</p>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #e0e0e0;border-top:none">
            <p style="color:#333">Your deal has been approved. Proceed with contracting.</p>
            <p style="color:#555;font-size:13px"><strong>Approved by:</strong> ${deal?.reviewedBy || 'Reviewer'}</p>
            ${deal?.reviewNotes ? `<p style="color:#555;font-size:13px"><strong>Notes:</strong> ${deal.reviewNotes}</p>` : ''}
            <p style="color:#888;font-size:12px">Deal ID: ${dealId}</p>
          </div>
        </div>`
    } else if (type === 'rejected') {
      to = [submitterEmail, deal?.inputs?.salespersonEmail].filter(Boolean)
      subject = `✗ Deal rejected: ${client}`
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#C00000;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Deal Rejected</h1>
            <p style="color:#FCE4D6;margin:4px 0 0">${client}</p>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #e0e0e0;border-top:none">
            <p style="color:#333">Your deal has been rejected.</p>
            <p style="color:#555;font-size:13px"><strong>Reviewed by:</strong> ${deal?.reviewedBy || 'Reviewer'}</p>
            ${deal?.reviewNotes ? `<p style="color:#555;font-size:13px"><strong>Reason:</strong> ${deal.reviewNotes}</p>` : ''}
            <p style="color:#555;font-size:13px">Please revise the deal and resubmit, or contact your manager for guidance.</p>
            <p style="color:#888;font-size:12px">Deal ID: ${dealId}</p>
          </div>
        </div>`
    } else if (type === 'overdue') {
      to = [approverEmail].filter(Boolean)
      subject = `[Overdue] Deal pending review: ${client}`
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#BF8F00;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Overdue Deal Review</h1>
            <p style="color:#FFF2CC;margin:4px 0 0">Action required — review window exceeded</p>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #e0e0e0;border-top:none">
            <p style="color:#333">A deal is awaiting review beyond the approval window.</p>
            <p style="color:#555;font-size:13px"><strong>Client:</strong> ${client}</p>
            <p style="color:#555;font-size:13px"><strong>Submitted by:</strong> ${salesperson}</p>
            <div style="text-align:center;margin:24px 0">
              <a href="${dealUrl}" style="background:#BF8F00;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">
                Review Now →
              </a>
            </div>
            <p style="color:#888;font-size:12px">Deal ID: ${dealId}</p>
          </div>
        </div>`
    }

    if (!RESEND_API_KEY) {
      console.log(`[Email not sent — RESEND_API_KEY not configured] Type: ${type}, To: ${to.join(', ')}`)
      return NextResponse.json({ ok: true, note: 'Email skipped — RESEND_API_KEY not set' })
    }

    if (to.length === 0) {
      return NextResponse.json({ ok: true, note: 'No recipients configured' })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })
    const data = await res.json()

    return NextResponse.json({ ok: res.ok, data })
  } catch (err) {
    console.error('Notify error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
