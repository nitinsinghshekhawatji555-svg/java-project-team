import { NextResponse } from 'next/server'

export async function PATCH() {
  return NextResponse.json(
    { error: 'Use PATCH /api/requests/status for rescue status changes' },
    { status: 410 }
  )
}
