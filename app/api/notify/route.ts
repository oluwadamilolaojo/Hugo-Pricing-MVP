// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { dealId, type, deal, approverEmail, submitterEmail } = await req.json()

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    // Fix 2: Use Hugo domain when configured, fallback for local dev
    const FROM_EMAIL = process.env.FROM_EMAIL || 'Hugo Pricing <pricing@hugotech.co>'
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-app.vercel.app'

    // Fix 1: Link directly to the specific deal, not just /deals
    const dealUrl = `${BASE_URL}/deals?id=${dealId}`
    const client = deal?.inputs?.clientName || 'Unknown Client'
    const salesperson = deal?.inputs?.salesperson || 'Unknown'
    const proposedRate = deal?.inputs?.proposedRate ? `$${Number(deal.inputs.proposedRate).toFixed(2)}/hr` : 'N/A'
    const floorRate = deal?.floorPL?.floorRate ? `$${Number(deal.floorPL.floorRate).toFixed(2)}/hr` : 'N/A'
    const gm = deal?.proposedPL?.grossMarginPct ? `${(Number(deal.proposedPL.grossMarginPct) * 100).toFixed(1)}%` : 'N/A'
    const floorGm = deal?.floorPL?.grossMarginPct ? `${(Number(deal.floorPL.grossMarginPct) * 100).toFixed(1)}%` : 'N/A'
    const monthlyRev = deal?.proposedPL?.totalMonthlyRev ? `$${Math.round(deal.proposedPL.totalMonthlyRev).toLocaleString()}` : 'N/A'
    const isInvCase = deal?.proposedPL?.investmentCaseRequired ? true : false
    const invNotes = deal?.investmentCaseNotes || ''
    const geo = deal?.inputs?.geography || 'N/A'
    const svc = deal?.inputs?.serviceType || 'N/A'
    const agents = deal?.inputs?.billableAgents || 'N/A'

    const styles = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 560px; margin: 0 auto; color: #1A1A1A;
    `
    const navStyle = `background:#1A1A1A;padding:16px 28px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:10px;`
    const logoStyle = `width:28px;height:28px;background:#F5C518;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#1A1A1A;`
    const cardStyle = `background:#F5F0E8;border:1px solid #DDD5C4;border-top:none;border-radius:0 0 10px 10px;padding:28px;`
    const metaRowStyle = `display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #DDD5C4;font-size:13px;`
    const labelStyle = `color:#888;`
    const valStyle = `font-weight:600;color:#1A1A1A;`
    const btnStyle = `display:inline-block;background:#1A1A1A;color:#F5C518;padding:13px 28px;border-radius:24px;text-decoration:none;font-weight:700;font-size:13px;`
    const invBtnStyle = `display:inline-block;background:#C00000;color:white;padding:13px 28px;border-radius:24px;text-decoration:none;font-weight:700;font-size:13px;`

    let to: string[] = []
    let subject = ''
    let html = ''

    if (type === 'submitted') {
      to = [approverEmail].filter(Boolean)
      subject = isInvCase
        ? `[Investment Case] Deal requires review: ${client}`
        : `[Action Required] Deal submitted for review: ${client}`

      html = `<div style="${styles}">
        <div style="${navStyle}">
          <div style="${logoStyle}">H</div>
          <span style="color:white;font-weight:600;font-size:14px;">hugo</span>
          <span style="color:#555;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-left:4px;">pricing</span>
        </div>
        <div style="${cardStyle}">
          ${isInvCase
            ? `<div style="background:#FFF2CC;border:1px solid #E8D87A;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
                <p style="color:#92700C;font-weight:700;font-size:13px;margin:0 0 4px;">⚠ Investment Case Required</p>
                <p style="color:#A0820A;font-size:12px;margin:0;">This deal is below the margin floor for ${geo}. Justification provided below.</p>
               </div>`
            : ''
          }
          <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">Deal submitted for review</h2>
          <p style="color:#888;font-size:13px;margin:0 0 20px;">Submitted by ${salesperson} · ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>

          <div style="margin-bottom:20px;">
            ${[
              ['Client', client],
              ['Geography', `${geo} · ${svc}`],
              ['Team size', `${agents} agents`],
              ['Floor rate', floorRate],
              ['Proposed rate', proposedRate],
              ['Floor GM', floorGm],
              ['Proposed GM', gm],
              ['Monthly revenue', monthlyRev],
            ].map(([l,v]) => `<div style="${metaRowStyle}"><span style="${labelStyle}">${l}</span><span style="${valStyle}">${v}</span></div>`).join('')}
          </div>

          ${isInvCase && invNotes ? `
          <div style="background:white;border:1px solid #DDD5C4;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
            <p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px;">Investment case justification</p>
            <p style="font-size:13px;color:#1A1A1A;margin:0;line-height:1.6;">${invNotes}</p>
          </div>` : ''}

          <div style="text-align:center;padding:8px 0 4px;">
            <a href="${dealUrl}" style="${isInvCase ? invBtnStyle : btnStyle}">
              Review ${client} →
            </a>
          </div>
          <p style="color:#AAA;font-size:11px;text-align:center;margin:12px 0 0;">Deal ID: ${dealId}</p>
        </div>
      </div>`

    } else if (type === 'approved') {
      to = [submitterEmail].filter(Boolean)
      subject = `✓ Deal approved: ${client}`
      html = `<div style="${styles}">
        <div style="${navStyle}">
          <div style="${logoStyle}">H</div>
          <span style="color:white;font-weight:600;font-size:14px;">hugo</span>
          <span style="color:#555;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-left:4px;">pricing</span>
        </div>
        <div style="${cardStyle}">
          <div style="background:#E2EFDA;border:1px solid #A8D08D;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="color:#375623;font-weight:700;font-size:13px;margin:0;">✓ Deal approved — proceed with contracting</p>
          </div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">${client}</h2>
          <p style="color:#888;font-size:13px;margin:0 0 20px;">${geo} · ${svc} · ${agents} agents</p>
          <div style="${metaRowStyle}"><span style="${labelStyle}">Approved by</span><span style="${valStyle}">${deal?.reviewedBy || 'Reviewer'}</span></div>
          <div style="${metaRowStyle}"><span style="${labelStyle}">Proposed rate</span><span style="${valStyle}">${proposedRate}</span></div>
          <div style="${metaRowStyle}"><span style="${labelStyle}">Gross margin</span><span style="${valStyle}">${gm}</span></div>
          ${deal?.reviewNotes ? `<div style="margin-top:16px;background:white;border:1px solid #DDD5C4;border-radius:8px;padding:14px 16px;"><p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px;">Notes</p><p style="font-size:13px;color:#1A1A1A;margin:0;">${deal.reviewNotes}</p></div>` : ''}
          <p style="color:#AAA;font-size:11px;text-align:center;margin:20px 0 0;">Deal ID: ${dealId}</p>
        </div>
      </div>`

    } else if (type === 'rejected') {
      to = [submitterEmail].filter(Boolean)
      subject = `✗ Deal not approved: ${client}`
      html = `<div style="${styles}">
        <div style="${navStyle}">
          <div style="${logoStyle}">H</div>
          <span style="color:white;font-weight:600;font-size:14px;">hugo</span>
          <span style="color:#555;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-left:4px;">pricing</span>
        </div>
        <div style="${cardStyle}">
          <div style="background:#FCE4D6;border:1px solid #E8A87A;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="color:#C00000;font-weight:700;font-size:13px;margin:0;">Deal not approved — please revise and resubmit</p>
          </div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">${client}</h2>
          <p style="color:#888;font-size:13px;margin:0 0 20px;">${geo} · ${svc}</p>
          <div style="${metaRowStyle}"><span style="${labelStyle}">Reviewed by</span><span style="${valStyle}">${deal?.reviewedBy || 'Reviewer'}</span></div>
          ${deal?.reviewNotes ? `<div style="margin-top:16px;background:white;border:1px solid #DDD5C4;border-radius:8px;padding:14px 16px;"><p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 6px;">Reason</p><p style="font-size:13px;color:#1A1A1A;margin:0;">${deal.reviewNotes}</p></div>` : ''}
          <p style="color:#555;font-size:12px;margin:16px 0 0;text-align:center;">Contact your manager if you have questions about this decision.</p>
          <p style="color:#AAA;font-size:11px;text-align:center;margin:8px 0 0;">Deal ID: ${dealId}</p>
        </div>
      </div>`

    } else if (type === 'overdue') {
      to = [approverEmail].filter(Boolean)
      subject = `[Overdue] Deal awaiting review: ${client}`
      html = `<div style="${styles}">
        <div style="${navStyle}">
          <div style="${logoStyle}">H</div>
          <span style="color:white;font-weight:600;font-size:14px;">hugo</span>
          <span style="color:#555;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-left:4px;">pricing</span>
        </div>
        <div style="${cardStyle}">
          <div style="background:#FFF2CC;border:1px solid #E8D87A;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
            <p style="color:#92700C;font-weight:700;font-size:13px;margin:0;">⚠ Review window exceeded — action required</p>
          </div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">${client}</h2>
          <p style="color:#888;font-size:13px;margin:0 0 20px;">Submitted by ${salesperson} · ${geo}</p>
          <div style="${metaRowStyle}"><span style="${labelStyle}">Proposed rate</span><span style="${valStyle}">${proposedRate}</span></div>
          <div style="${metaRowStyle}"><span style="${labelStyle}">Gross margin</span><span style="${valStyle}">${gm}</span></div>
          <div style="text-align:center;padding:20px 0 4px;">
            <a href="${dealUrl}" style="display:inline-block;background:#92700C;color:white;padding:13px 28px;border-radius:24px;text-decoration:none;font-weight:700;font-size:13px;">
              Review ${client} Now →
            </a>
          </div>
          <p style="color:#AAA;font-size:11px;text-align:center;margin:12px 0 0;">Deal ID: ${dealId}</p>
        </div>
      </div>`
    }

    if (!RESEND_API_KEY) {
      console.log(`[Email skipped — RESEND_API_KEY not set] Type: ${type}, To: ${to.join(', ')}, Link: ${dealUrl}`)
      return NextResponse.json({ ok: true, note: 'Email skipped — RESEND_API_KEY not configured', link: dealUrl })
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
