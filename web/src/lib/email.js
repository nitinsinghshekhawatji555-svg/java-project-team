import { Resend } from 'resend'

let resendInstance = null
function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return null
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

const primaryFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@roadrescue.com'
const fallbackFromEmail = 'RoadRescue <onboarding@resend.dev>'

export async function sendNotificationEmail({
  to,
  subject,
  type, // 'new_request', 'mechanic_accepted', 'job_completed', etc.
  data, // context-specific data (e.g., driver name, mechanic name, request details)
}) {
  if (!to) {
    console.error('sendNotificationEmail: missing recipient email')
    return null
  }

  // Build HTML content based on notification type
  const htmlContent = buildEmailTemplate(type, data)

  try {
    const resend = getResend()
    if (resend) {
      let result = await resend.emails.send({
        from: primaryFromEmail,
        to,
        subject,
        html: htmlContent,
      })

      if (result.error?.statusCode === 403 || result.error?.name === 'validation_error') {
        console.warn('Primary Resend sender rejected, retrying with fallback onboarding sender')
        result = await resend.emails.send({
          from: fallbackFromEmail,
          to,
          subject,
          html: htmlContent,
        })
      }

      if (result.error) {
        console.error('Resend error:', result.error)
        return null
      }

      return { success: true, messageId: result.data?.id }
    }

    // Client-side fallback if called in browser
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          htmlContent,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to send notification email:', error)
        return null
      }

      return await response.json()
    }

    return null
  } catch (error) {
    console.error('Error sending notification email:', error)
    return null
  }
}

/**
 * Build HTML email templates for different notification types
 */
function buildEmailTemplate(type, data = {}) {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: #f8f8f8;
    padding: 20px;
  `

  const headerStyle = `
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    color: white;
    padding: 30px;
    border-radius: 12px 12px 0 0;
    text-align: center;
  `

  const contentStyle = `
    background: white;
    padding: 30px;
    border-radius: 0 0 12px 12px;
    color: #334155;
  `

  const buttonStyle = `
    display: inline-block;
    background: #f5c400;
    color: #111827;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: bold;
    margin-top: 20px;
  `

  switch (type) {
    case 'new_request':
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 24px;">New Rescue Request</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi <strong>${data.mechanicName || 'Mechanic'}</strong>,</p>
            <p>A new rescue request has been posted near you:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Issue:</strong> ${data.issueDescription || 'Vehicle breakdown'}</p>
              <p><strong>Location:</strong> ${data.location || 'Accra'}</p>
              <p><strong>Distance:</strong> ${data.distance || 'N/A'} away</p>
            </div>
            <p>Accept and head to the driver's location.</p>
            <a href="${data.appUrl || 'https://roadrescue-gh.vercel.app/requests'}" style="${buttonStyle}">View Request</a>
          </div>
        </div>
      `

    case 'mechanic_accepted':
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 24px;">Mechanic Accepted</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi <strong>${data.driverName || 'Driver'}</strong>,</p>
            <p><strong>${data.mechanicName || 'A mechanic'}</strong> accepted your rescue request and is heading to your location.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Mechanic:</strong> ${data.mechanicName}</p>
              <p><strong>Location:</strong> ${data.location || 'Pinned Coordinates'}</p>
            </div>
            <p>They'll arrive soon. You can track their progress in the app.</p>
            <a href="${data.appUrl || 'https://roadrescue-gh.vercel.app'}" style="${buttonStyle}">Track Progress</a>
          </div>
        </div>
      `

    case 'job_completed':
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 24px;">Job Complete</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi <strong>${data.driverName || 'Driver'}</strong>,</p>
            <p><strong>${data.mechanicName || 'The mechanic'}</strong> has completed your rescue request.</p>
            <p>Please take a moment to rate your experience and leave feedback.</p>
            <a href="${data.appUrl || 'https://roadrescue-gh.vercel.app/requests'}" style="${buttonStyle}">Rate & Review</a>
          </div>
        </div>
      `

    case 'job_completed_with_no_feedback':
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 24px;">Until your next smooth mile!</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi <strong>${data.driverName || 'Driver'}</strong>,</p>
            <p><strong>${data.mechanicName || 'The mechanic'}</strong> has completed your rescue request.</p>
            <p>We hope you had a smooth experience! Drive safe.</p>
          </div>
        </div>
      `

    case 'farewell_safety':
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 24px;">Safe Travels Ahead</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi <strong>${data.driverName || 'Driver'}</strong>,</p>
            <p>Your vehicle maintenance tracking log has been updated successfully.</p>
            <div style="background: #fffbeb; border-left: 4px solid #f5c400; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-style: italic; font-weight: bold; color: #7c2d12;">
                "Until your next smooth ride, stay safe and drive responsibly!"
              </p>
            </div>
            <p>Thank you for trusting the RoadRescue dispatch network.</p>
          </div>
        </div>
      `

    case 'mechanic_en_route':
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 24px;">Mechanic On The Way</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi <strong>${data.driverName || 'Driver'}</strong>,</p>
            <p><strong>${data.mechanicName || 'Your mechanic'}</strong> is on the way to your location.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Estimated arrival:</strong> ${data.estimatedArrival || '10-15 minutes'}</p>
              <p><strong>Mechanic:</strong> ${data.mechanicName}</p>
            </div>
            <p>Track their location in real-time in the app.</p>
            <a href="${data.appUrl || 'https://roadrescue-gh.vercel.app/requests'}" style="${buttonStyle}">Track Location</a>
          </div>
        </div>
      `

    default:
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 20px;">RoadRescue Notification</h1>
          </div>
          <div style="${contentStyle}">
            <p>${data.message || 'You have a new notification.'}</p>
            <a href="${data.appUrl || 'https://roadrescue-gh.vercel.app'}" style="${buttonStyle}">Open App</a>
          </div>
        </div>
      `
  }
}