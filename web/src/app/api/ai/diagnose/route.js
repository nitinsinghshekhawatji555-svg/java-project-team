// web/src/app/api/ai/diagnose/route.js
import { NextResponse } from 'next/server'
import { diagnoseLimiter } from '@/lib/rateLimit'
import { sanitizeInput } from '@/lib/validate'
import { createClient } from '@/lib/supabase/server'
import { aiProviderManager } from '@/lib/ai/AiProviderManager'
import { buildFallbackDiagnosis } from '@/lib/ai/ruleFallback'
import { normalizeString } from '@/lib/ai/types'

export async function POST(request) {
  try {
    const rawBody = await request.json()
    const body = sanitizeInput(rawBody) || {}
    const symptoms = normalizeString(body.symptoms)
    const vehicleMake = normalizeString(body.vehicleMake)
    const vehicleModel = normalizeString(body.vehicleModel)
    const vehicleYear = normalizeString(body.vehicleYear)

    // Client-side validation: symptoms must be provided. Do not trigger AI fallback for empty input.
    if (!symptoms) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please describe the breakdown symptoms before running diagnosis.',
        },
        { status: 400 }
      )
    }

    // Resolve rate limiting identifier: prioritize authenticated user ID
    let rateLimitKey = 'anonymous'
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.id) {
        rateLimitKey = `user:${user.id}`
      } else {
        const ip =
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          'anonymous'
        rateLimitKey = `ip:${ip}`
      }
    } catch {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'anonymous'
      rateLimitKey = `ip:${ip}`
    }

    const limit = diagnoseLimiter(rateLimitKey)
    if (!limit.allowed) {
      console.warn(`[AI RATE LIMIT TRIGGERED] Key: ${rateLimitKey}`)
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit reached (20 req/min). Showing preliminary guidance.',
          diagnosis: buildFallbackDiagnosis(
            symptoms,
            'Rate limit reached. Full AI diagnosis paused for 1 minute.'
          ),
        },
        { status: 429 }
      )
    }

    const diagnosis = await aiProviderManager.diagnose({
      symptoms,
      vehicleMake,
      vehicleModel,
      vehicleYear,
    })

    return NextResponse.json({
      success: true,
      diagnosis,
    })
  } catch (error) {
    console.error('[AI DIAGNOSE FATAL INTERCEPT]', error?.message || error)
    return NextResponse.json(
      {
        success: false,
        error: 'Diagnostic service error. Showing standard guidance.',
        diagnosis: buildFallbackDiagnosis(
          '',
          'Diagnostic engine encountered an unexpected internal error.'
        ),
      },
      { status: 500 }
    )
  }
}
