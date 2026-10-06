import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, createErrorResponse } from '@/lib/rbac'

export async function POST(req) {
  try {
    const access = await requireAdmin()
    if (access.error) {
      return createErrorResponse(access.error, access.status)
    }

    const { filePath } = await req.json()
    if (!filePath) {
      return createErrorResponse('filePath parameter is required', 400)
    }

    const serviceSupabase = await createServiceClient()
    const { data, error } = await serviceSupabase.storage
      .from('mechanic-documents')
      .createSignedUrl(filePath, 300)

    if (error) {
      console.error('Error generating signed URL for admin:', error)
      return createErrorResponse(error.message, 500)
    }

    return NextResponse.json({ signedUrl: data.signedUrl }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error in admin document-url route:', err)
    return createErrorResponse('Internal server error', 500)
  }
}
