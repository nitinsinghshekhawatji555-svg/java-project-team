import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, createErrorResponse } from '@/lib/rbac'
import { sanitizeInput } from '@/lib/validate'

// Structural lookup mapping matrices for safety verification checks
const driverFieldMap = {
  full_name: { table: 'profiles', column: 'full_name' },
  phone: { table: 'profiles', column: 'phone' },
  vehicle_make: { table: 'driver_profiles', column: 'vehicle_make' },
  vehicle_model: { table: 'driver_profiles', column: 'vehicle_model' },
  vehicle_year: { table: 'driver_profiles', column: 'vehicle_year' },
  vehicle_color: { table: 'driver_profiles', column: 'vehicle_color' },
  vehicle_plate: { table: 'driver_profiles', column: 'vehicle_plate' },
  emergency_contact_name: { table: 'driver_profiles', column: 'emergency_contact_name' },
  emergency_contact_phone: { table: 'driver_profiles', column: 'emergency_contact_phone' },
  home_area: { table: 'driver_profiles', column: 'home_area' },
}

const mechanicFieldMap = {
  phone: { table: 'profiles', column: 'phone' },
  business_name: { table: 'mechanic_profiles', column: 'business_name' },
  specializations: { table: 'mechanic_profiles', column: 'specializations' },
  years_experience: { table: 'mechanic_profiles', column: 'years_experience' },
  license_number: { table: 'mechanic_profiles', column: 'license_number' },
  license_expiry: { table: 'mechanic_profiles', column: 'license_expiry' },
  service_radius: { table: 'mechanic_profiles', column: 'service_radius' },
  location_label: { table: 'mechanic_profiles', column: 'location_label' },
}

function mapField(targetTable, fieldKey) {
  if (targetTable === 'driver_profiles' || targetTable === 'profiles') return driverFieldMap[fieldKey] || null
  if (targetTable === 'mechanic_profiles') return mechanicFieldMap[fieldKey] || null
  return null
}

// ================================================
// GET PORTAL: READ PENDING APPROVAL QUEUE
// ================================================
export async function GET(req) {
  try {
    const access = await requireAdmin()
    if (access.error) return createErrorResponse(access.error, access.status)

    const serviceSupabase = await createServiceClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    const { data, error } = await serviceSupabase
      .from('profile_change_requests')
      .select(`
        *,
        user:profiles!profile_change_requests_user_id_fkey (id, full_name, email, phone, role),
        reviewer:profiles!profile_change_requests_reviewed_by_fkey (id, full_name)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: data || [] }, { status: 200 })
  } catch (error) {
    console.error('[SERVER ROUTE FAULT] GET change requests failed:', error)
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: error.message || 'Internal server error processing reviews' }, { status })
  }
}

// ================================================
// PATCH PORTAL: RESOLVE AND EXECUTE DATA METRICS
// ================================================
export async function PATCH(req) {
  try {
    const access = await requireAdmin()
    if (access.error) return createErrorResponse(access.error, access.status)

    const { profile } = access
    const serviceSupabase = await createServiceClient()
    const rawBody = await req.json()
    const body = sanitizeInput(rawBody)
    const { requestId, action, reviewNotes } = body

    if (!requestId || !action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'requestId and a valid action state parameter are required' }, { status: 400 })
    }

    // 1. Locate current review log record entry
    const { data: changeRequest, error: requestError } = await serviceSupabase
      .from('profile_change_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !changeRequest) {
      return NextResponse.json({ error: 'Target update transaction record not found' }, { status: 404 })
    }

    // 2. Execute target row value migrations if action is approved
    if (action === 'approved') {
      const mapping = mapField(changeRequest.target_table, changeRequest.field_key)
      if (!mapping) {
        return NextResponse.json({ error: 'Unsupported field column configuration for approval workflow' }, { status: 400 })
      }

      // Production Hardening: Safely handle JSONB values.
      // If the incoming text string value is already pre-wrapped in an absolute payload map object, use it directly.
      // Otherwise, explicitly bundle it inside the target column mapping parameter context.
      let updateValue = {}
      if (
        changeRequest.new_value && 
        typeof changeRequest.new_value === 'object' && 
        !Array.isArray(changeRequest.new_value) &&
        changeRequest.new_value.hasOwnProperty(mapping.column)
      ) {
        updateValue = changeRequest.new_value
      } else {
        updateValue = { [mapping.column]: changeRequest.new_value }
      }

      // Mutate the targeted data rows inside production tables securely via service role privileges
      const { error: updateError } = await serviceSupabase
        .from(mapping.table)
        .update(updateValue)
        .eq(mapping.table === 'profiles' ? 'id' : 'user_id', changeRequest.user_id)

      if (updateError) {
        console.error('[DATA COMMIT BLOCK FAULT]:', updateError)
        return NextResponse.json({ error: `Failed to execute data merge update pipeline into table: ${mapping.table}` }, { status: 500 })
      }
    }

    // 3. Commit review decision tracking parameters back onto the audit trail table row
    const { data: updatedRecord, error: auditUpdateError } = await serviceSupabase
      .from('profile_change_requests')
      .update({
        status: action,
        review_notes: reviewNotes || (action === 'approved' ? 'Approved by operations command' : 'Rejected by operations command'),
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select(`
        *,
        user:profiles!profile_change_requests_user_id_fkey (id, full_name, email, phone, role),
        reviewer:profiles!profile_change_requests_reviewed_by_fkey (id, full_name)
      `)
      .single()

    if (auditUpdateError) throw auditUpdateError

    // Notify the user about their change request review decision
    try {
      await serviceSupabase.from('notifications').insert({
        profile_id: changeRequest.user_id,
        type: 'system',
        title: action === 'approved' ? 'Change Request Approved' : 'Change Request Rejected',
        body: `Your request to update your ${changeRequest.field_key} has been ${action}. ${reviewNotes || ''}`,
        is_read: false,
      })
    } catch (e) {
      console.warn('Failed to insert change request notification:', e)
    }

    return NextResponse.json({ success: true, request: updatedRecord }, { status: 200 })
  } catch (error) {
    console.error('[SERVER ROUTE FAULT] PATCH change requests failed:', error)
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: error.message || 'Internal processing error executing audit clearance' }, { status })
  }
}