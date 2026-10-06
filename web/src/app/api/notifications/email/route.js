import { Resend } from 'resend'
import { protectApiRoute } from '@/lib/rbac'

let resend
function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY')
    }
    resend = new Resend(apiKey)
  }
  return resend
}
const primaryFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@roadrescue.com'
const fallbackFromEmail = 'RoadRescue <onboarding@resend.dev>'

async function sendEmail({ to, subject, html }) {
  return getResend().emails.send({
    from: primaryFromEmail,
    to,
    subject,
    html,
  })
}

export async function POST(request) {
  try {
    const authResult = await protectApiRoute()
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, profile } = authResult
    const { to, subject, message, htmlContent } = await request.json()

    if (!to) {
      return Response.json({ error: 'Missing recipient email' }, { status: 400 })
    }

    if (!subject) {
      return Response.json({ error: 'Missing email subject' }, { status: 400 })
    }

    if (!message && !htmlContent) {
      return Response.json({ error: 'Missing email body (message or htmlContent)' }, { status: 400 })
    }

    // SECURITY RESTRICTION: Only admins can send arbitrary emails.
    // Non-admin users (drivers, mechanics) can only receive/trigger emails addressed directly to their own verified email.
    const isAdmin = profile?.role === 'admin'
    const isSelfRecipient = user?.email && to.toLowerCase().trim() === user.email.toLowerCase().trim()

    if (!isAdmin && !isSelfRecipient) {
      return Response.json(
        { error: 'Forbidden: Insufficient privileges to dispatch emails to arbitrary recipients' },
        { status: 403 }
      )
    }

    const html = htmlContent || `<p>${message}</p>`

    let result = await sendEmail({ to, subject, html })

    if (result.error?.statusCode === 403 || result.error?.name === 'validation_error') {
      console.warn('Primary Resend sender rejected, retrying with fallback onboarding sender')
      result = await getResend().emails.send({
        from: fallbackFromEmail,
        to,
        subject,
        html,
      })
    }

    if (result.error) {
      console.error('Resend error:', result.error)
      return Response.json({ error: 'Failed to send email', details: result.error }, { status: 500 })
    }

    return Response.json({ success: true, messageId: result.data.id }, { status: 200 })
  } catch (error) {
    console.error('Email API error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
