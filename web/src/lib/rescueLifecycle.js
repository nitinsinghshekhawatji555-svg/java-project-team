export const REQUEST_STATUS_FLOW = {
  pending: ['accepted', 'cancelled'],
  offered: ['accepted', 'cancelled'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export const NOTIFICATION_TYPES = {
  NEW_REQUEST: 'new_request',
  MECHANIC_ACCEPTED: 'mechanic_accepted',
  MECHANIC_EN_ROUTE: 'mechanic_en_route',
  MECHANIC_ARRIVED: 'mechanic_arrived',
  JOB_COMPLETED: 'job_completed',
  REQUEST_CANCELLED: 'request_cancelled',
  SYSTEM_ALERT: 'system_alert',
}

export function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeStatus(value) {
  return normalizeString(value).toLowerCase()
}

export function normalizeServiceType(value) {
  const normalized = normalizeStatus(value)
  return normalized || 'other'
}

export function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function buildGeoPoint(longitude, latitude) {
  return `SRID=4326;POINT(${longitude} ${latitude})`
}

export function decodeHtmlEntities(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;|&#38;/g, '&')
    .replace(/&lt;|&#60;/g, '<')
    .replace(/&gt;|&#62;/g, '>')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#x2F;|&#47;/g, '/')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
}

export function normalizeDiagnosticResult(value) {
  if (!value) return null
  if (typeof value !== 'object') return null

  const rawProblem = Array.isArray(value.problems)
    ? value.problems[0]
    : value.problem || value.summary || ''

  const rawRecommendations = Array.isArray(value.recommendations) ? value.recommendations : []
  const rawCauses = Array.isArray(value.estimated_causes)
    ? value.estimated_causes
    : Array.isArray(value.estimatedCauses)
      ? value.estimatedCauses
      : []

  return {
    problem: decodeHtmlEntities(rawProblem),
    severity: value.severity || 'low',
    recommendations: rawRecommendations.map(decodeHtmlEntities),
    estimated_causes: rawCauses.map(decodeHtmlEntities),
  }
}

export function parseRequestPayload(payload = {}) {
  const latitude = toNumberOrNull(payload.latitude ?? payload.incidentLatitude)
  const longitude = toNumberOrNull(payload.longitude ?? payload.incidentLongitude)
  const vehicleDetails = normalizeString(
    payload.vehicleDetails ?? payload.vehicle_details ?? payload.vehicle_details_text
  )
  const issue = normalizeString(
    payload.issue ?? payload.issue_description ?? payload.problemDescription ?? payload.problem_description
  )
  const locationAddress = normalizeString(
    payload.locationAddress ?? payload.location_address ?? payload.location ?? payload.incident_address
  )
  const serviceType = normalizeServiceType(payload.serviceType ?? payload.service_type)

  return {
    latitude,
    longitude,
    vehicleDetails,
    issue,
    locationAddress,
    serviceType,
    diagnostics: normalizeDiagnosticResult(
      payload.diagnostics ?? payload.aiDiagnosticResult ?? payload.ai_diagnostic_result
    ),
  }
}

export function isValidTransition(currentStatus, nextStatus) {
  const current = normalizeStatus(currentStatus)
  const next = normalizeStatus(nextStatus)

  return REQUEST_STATUS_FLOW[current]?.includes(next) ?? false
}

export async function getRequestContext() {
  const { createClient, createServiceClient } = await import('./supabase/server.js')
  const userClient = await createClient()
  const serviceClient = await createServiceClient()
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()

  if (authError || !user) {
    return {
      error: 'Unauthorized',
      status: 401,
    }
  }

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      error: 'Profile not found',
      status: 404,
    }
  }

  return {
    user,
    profile,
    userClient,
    serviceClient,
  }
}

export async function insertNotifications(serviceClient, notifications) {
  if (!notifications.length) return []

  // Ensure request_id is embedded in the body as [req_id: ID] for fallback parsing on the client
  const prepped = notifications.map(notif => {
    let body = notif.body || ''
    if (notif.request_id && !body.includes('[req_id:')) {
      body = `${body} [req_id: ${notif.request_id}]`.trim()
    }
    return {
      ...notif,
      body
    }
  })

  try {
    const { data, error } = await serviceClient
      .from('notifications')
      .insert(prepped)
      .select('*')

    if (error) throw error
    return data ?? []
  } catch (error) {
    // If the database has no request_id column, retry without it
    if (error.code === 'PGRST204' || String(error.message || '').includes('request_id')) {
      const fallbackNotifs = prepped.map(({ request_id, ...rest }) => rest)
      const { data, error: fallbackError } = await serviceClient
        .from('notifications')
        .insert(fallbackNotifs)
        .select('*')

      if (fallbackError) throw fallbackError
      return data ?? []
    }
    throw error
  }
}

export async function getNearbyMechanics(serviceClient, latitude, longitude, searchRadiusKm = 10) {
  const { data, error } = await serviceClient.rpc('get_nearby_verified_mechanics', {
    lat: latitude,
    lng: longitude,
    radius_km: searchRadiusKm,
  })

  if (error) throw error

  return data ?? []
}

export async function getRatingSummary(serviceClient, mechanicId) {
  const { data, error } = await serviceClient
    .from('request_reviews')
    .select('rating')
    .eq('mechanic_id', mechanicId)

  if (error) throw error

  const reviews = data ?? []
  const ratingTotal = reviews.reduce((sum, review) => sum + Number(review.rating), 0)

  return {
    totalJobs: reviews.length,
    ratingAvg: reviews.length ? Number((ratingTotal / reviews.length).toFixed(2)) : 0,
  }
}

export function formatRequestRow(request, extras = {}) {
  const vehicleDetails =
    request.vehicle_details ??
    extras.vehicleDetails ??
    [request.vehicle_year, request.vehicle_make, request.vehicle_model, request.vehicle_color, request.vehicle_plate]
      .filter(Boolean)
      .join(' ')
      .trim()

  return {
    ...request,
    vehicleDetails,
    issue: request.issue_description ?? request.problem_description ?? extras.issue ?? '',
    location: request.location_address ?? request.incident_address ?? extras.location ?? '',
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    vehicle_image_url: request.vehicle_image_url ?? extras.vehicle_image_url ?? null,
    assignedMechanic: extras.assignedMechanic ?? null,
    bids: extras.bids ?? [],
    driver: extras.driver ?? null,
    serviceType: request.service_type,
  }
}
