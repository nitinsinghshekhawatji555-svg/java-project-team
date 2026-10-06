// web/src/app/api/requests/rate/route.js

import { createClient } from '@/lib/supabase/server'
import { submitRating } from '@/lib/request'
import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/lib/validate'

export async function PATCH(req) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await req.json()
    const body = sanitizeInput(rawBody)
    const { requestId, rating, review } = body

    if (!requestId || !rating) {
      return NextResponse.json(
        { error: 'requestId and rating are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const result = await submitRating(supabase, {
      requestId,
      driverId: user.id,
      rating,
      review,
    })

    return NextResponse.json(result, { status: 200 })

  } catch (err) {
    console.error('[PATCH /api/requests/rate]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
