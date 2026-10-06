import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))

    const { source, eventType, data } = body

    if (!source || !eventType) {
      return NextResponse.json({ error: 'source and eventType are required' }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
