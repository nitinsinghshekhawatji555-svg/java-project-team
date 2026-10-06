// web/src/lib/rateLimit.js
// Simple in-memory rate limiter for API routes.
// Good enough for FYP scale.
// In production you would use Redis via Upstash.

const requestCounts = new Map()

// windowMs  → time window in milliseconds
// max       → max requests allowed in that window
export function rateLimit({ windowMs = 60000, max = 10 } = {}) {
  return function check(identifier) {
    const now = Date.now()
    const windowStart = now - windowMs

    // get or initialise request log for this identifier
    if (!requestCounts.has(identifier)) {
      requestCounts.set(identifier, [])
    }

    const requests = requestCounts.get(identifier)

    // remove timestamps outside the current window
    const recentRequests = requests.filter(time => time > windowStart)
    requestCounts.set(identifier, recentRequests)

    if (recentRequests.length >= max) {
      return { allowed: false, remaining: 0 }
    }

    // log this request
    recentRequests.push(now)
    return { allowed: true, remaining: max - recentRequests.length }
  }
}

// pre-configured limiters for different route types
// diagnose uses Gemini model calls — set to 20 requests/minute per authenticated user/IP
export const diagnoseLimiter = rateLimit({ windowMs: 60000, max: 20 })

// request creation — a driver shouldn't spam requests
export const requestLimiter = rateLimit({ windowMs: 60000, max: 10 })

// general API calls
export const generalLimiter = rateLimit({ windowMs: 60000, max: 60 })