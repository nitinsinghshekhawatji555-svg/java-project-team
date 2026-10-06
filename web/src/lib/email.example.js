/**
 * EXAMPLE: How to use email notifications in API routes
 * This shows the pattern for integrating email with rescue request lifecycle
 * 
 * NOTE: These are separate code examples. Choose one pattern for your use case.
 * Do not combine these into a single file.
 */

/*

// ─────────────────────────────────────────────────────────
// EXAMPLE 1: Notify mechanics of new rescue request
// ─────────────────────────────────────────────────────────

// In web/src/app/api/requests/route.js (when driver creates a rescue request):

// import { sendNotificationEmail } from '@/lib/email'

export async function POST(request) {
  // ... your existing code to create rescue request ...

  // After creating the request and finding nearby mechanics:

  const nearbyMechanics = []

  // Example: iterate and send (uncomment and implement sendNotificationEmail)
  // for (const mechanic of nearbyMechanics) {
  //   await sendNotificationEmail({
  //     to: mechanic.email,
  //     subject: `New Rescue Request: ${issue_description}`,
  //     type: 'new_request',
  //     data: { },
  //   })
  // }

  return Response.json({ success: true, request: rescueRequest })
}

// ─────────────────────────────────────────────────────────

// In web/src/app/api/requests/[id]/route.js (when mechanic marks job completed):

// import { sendNotificationEmail } from '@/lib/email'

export async function PATCH(request, { params }) {
  // ... your existing completion code ...

  const mechanic = null
  const driver = null

  // Send email to driver that job is done (example)
  // await sendNotificationEmail({
  //   to: driver.email,
  //   subject: 'Your Rescue Service Is Complete!',
  //   type: 'job_completed',
  //   data: { driverName: driver.full_name, mechanicName: mechanic.full_name, appUrl: 'https://roadrescue-gh.vercel.app/requests' },
  // })

  return Response.json({ success: true })
}

*/
