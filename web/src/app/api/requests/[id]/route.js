import {
  formatRequestRow,
  getRequestContext,
  normalizeDiagnosticResult,
} from '@/lib/rescueLifecycle'

async function fetchRequestDetails(serviceClient, requestId) {
  const { data: request, error: requestError } = await serviceClient
    .from('rescue_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestError) throw requestError
  if (!request) return null

  const [driverResult, mechanicResult, mechanicProfileResult, reviewResult, reportsResult] = await Promise.all([
    serviceClient
      .from('profiles')
      .select('id, full_name, phone, avatar_url')
      .eq('id', request.driver_id)
      .maybeSingle(),
    request.mechanic_id
      ? serviceClient
          .from('profiles')
          .select('id, full_name, phone, avatar_url')
          .eq('id', request.mechanic_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    request.mechanic_id
      ? serviceClient
          .from('mechanic_profiles')
          .select('rating_avg, rating_count, business_name, specializations, location_label, service_mode, current_location, is_available, current_status')
          .eq('user_id', request.mechanic_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    serviceClient
      .from('request_reviews')
      .select('rating, review')
      .eq('request_id', requestId)
      .maybeSingle(),
    serviceClient
      .from('issue_reports')
      .select('*')
      .eq('request_id', requestId)
  ])

  const mechanic = mechanicResult.data
    ? {
        ...mechanicResult.data,
        mechanic_profiles: mechanicProfileResult.data
          ? {
              rating_avg: mechanicProfileResult.data.rating_avg,
              rating_count: mechanicProfileResult.data.rating_count,
              specializations: mechanicProfileResult.data.specializations,
              business_name: mechanicProfileResult.data.business_name,
              location_label: mechanicProfileResult.data.location_label,
              service_mode: mechanicProfileResult.data.service_mode || 'mobile',
              current_location: mechanicProfileResult.data.current_location,
              is_available: mechanicProfileResult.data.is_available,
              current_status: mechanicProfileResult.data.current_status,
            }
          : null,
      }
    : null

  const formatted = formatRequestRow(request, {
    driver: driverResult.data
      ? {
          id: driverResult.data.id,
          full_name: driverResult.data.full_name,
          phone: driverResult.data.phone,
          avatar_url: driverResult.data.avatar_url,
        }
      : null,
    assignedMechanic: mechanic,
  })

  formatted.rating = reviewResult.data?.rating || null
  formatted.review = reviewResult.data?.review || null
  formatted.reports = reportsResult.data || []

  return formatted
}

export async function GET(request, { params }) {
  try {
    const context = await getRequestContext()
    if (context.error) {
      return Response.json({ error: context.error }, { status: context.status })
    }

    const { user, profile, serviceClient } = context
    
    // FIXED: Explicitly await dynamic params promise before accessing id property
    const resolvedParams = await params
    const requestId = resolvedParams?.id

    if (!requestId) {
      return Response.json({ error: 'Missing request identification parameter' }, { status: 400 })
    }

    const { data: rescueRequest, error } = await serviceClient
      .from('rescue_requests')
      .select('id, driver_id, mechanic_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (error) throw error
    if (!rescueRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 })
    }

    const hasAccess =
      profile.role === 'admin' ||
      rescueRequest.driver_id === user.id ||
      rescueRequest.mechanic_id === user.id ||
      (profile.role === 'mechanic' && !rescueRequest.mechanic_id && (rescueRequest.status === 'pending' || rescueRequest.status === 'offered'))

    if (!hasAccess) {
      return Response.json({ error: 'Not authorized to view this request' }, { status: 403 })
    }

    const requestDetails = await fetchRequestDetails(serviceClient, requestId)

    return Response.json({ request: requestDetails }, { status: 200 })
  } catch (error) {
    console.error('Request details error:', error)
    return Response.json({ error: 'Failed to load request' }, { status: 500 })
  }
}

export async function PATCH() {
  return Response.json(
    { error: 'Use PATCH /api/requests/status for rescue status changes' },
    { status: 410 }
  )
}