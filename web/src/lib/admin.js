import { VERIFICATION_STATUS } from '@/lib/constants'

// ============================================================================
// 1. MECHANIC VERIFICATION MECHANICS (FIXED UNIFIED STRUCTURAL JOIN)
// ============================================================================

/**
 * Fetch all mechanics matching a given verification state
 * Pulls from verification logs, profiles, and workshop metadata tables in one query.
 */
export async function getMechanicsByStatus(serviceSupabase, status = 'pending') {
  // FIXED: Executing an elegant inner relational join strategy instead of repetitive loop queries
  const { data: verifications, error: verifyError } = await serviceSupabase
    .from('mechanic_verifications')
    .select(`
      id,
      status,
      created_at,
      mechanic_id,
      mechanic_profiles!inner(
        business_name,
        years_experience,
        location_label,
        specializations,
        profiles!user_id(
          id,
          full_name,
          phone,
          avatar_url,
          role
        ),
        mechanic_documents(
          id,
          document_name,
          file_url,
          created_at
        )
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: true })

  if (verifyError) {
    console.error('[DB EXCEPTION] Unified join verification pipeline failed:', verifyError.message)
    throw verifyError
  }

  // Map the clean database relational nesting straight to your frontend model expectations
  const mapped = (verifications || []).map((item) => {
    const mechProfile = item.mechanic_profiles
    const userProfile = mechProfile?.profiles

    // Safe JSON processing for specialized tag objects
    let specs = []
    if (mechProfile?.specializations) {
      if (Array.isArray(mechProfile.specializations)) {
        specs = mechProfile.specializations
      } else if (typeof mechProfile.specializations === 'string') {
        try {
          specs = JSON.parse(mechProfile.specializations)
        } catch {
          specs = []
        }
      }
    }

    return {
      user_id: item.mechanic_id,
      business_name: mechProfile?.business_name || 'Independent Operator',
      years_experience: mechProfile?.years_experience || 0,
      location_label: mechProfile?.location_label || 'Ghana Grid Node',
      specializations: specs,
      verification_status: item.status,
      created_at: item.created_at,
      user: userProfile || null, // Feeds user.role seamlessly to your page's client filter
      documents: mechProfile?.mechanic_documents || []
    }
  })

  // Deduplicate based on user_id, keeping the latest verification log (ordered by created_at ascending)
  const uniqueMechanics = Array.from(
    mapped.reduce((map, item) => {
      map.set(item.user_id, item)
      return map
    }, new Map()).values()
  )

  return uniqueMechanics
}

/**
 * Approve or reject a mechanic verification log row and record an immutable audit entry
 */
export async function updateMechanicVerification(
  serviceSupabase,
  mechanicUserId,
  newStatus,
  adminId,
  reason = null
) {
  const statusMap = {
    verified: 'approved',
    approve: 'approved',
  }

  const isMoreInfo = newStatus === 'more_info'
  const dbStatus = isMoreInfo ? 'pending' : (statusMap[newStatus] || newStatus)

  // Map to audit action enum ('verified', 'rejected', 'more_info_requested')
  const auditAction = dbStatus === 'approved'
    ? 'verified'
    : (newStatus === 'rejected' ? 'rejected' : 'more_info_requested')

  const auditReason = isMoreInfo
    ? (reason || 'Additional information/credentials requested by admin')
    : (newStatus === 'rejected' ? reason : null)

  if (auditAction === 'rejected' && (!auditReason || !auditReason.trim())) {
    throw new Error('A justification reason is required when rejecting a mechanic application')
  }

  // 1. Write immutable audit log record
  const { error: auditError } = await serviceSupabase
    .from('mechanic_verification_audit')
    .insert({
      admin_id: adminId,
      mechanic_id: mechanicUserId,
      action: auditAction,
      reason: auditReason,
      metadata: {
        raw_status: newStatus,
        db_status: dbStatus,
        reviewed_at: new Date().toISOString()
      }
    })

  if (auditError) {
    console.error('[AUDIT LOG ERROR] Failed to record mechanic verification audit row:', auditError.message)
    throw new Error(`Audit recording failed: ${auditError.message}`)
  }

  // 2. Commit the review metadata to mechanic_verifications
  const updatePayload = {
    status: dbStatus,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
    rejection_reason: auditReason,
  }

  const { data, error } = await serviceSupabase
    .from('mechanic_verifications')
    .update(updatePayload)
    .eq('mechanic_id', mechanicUserId)
    .select()

  if (error) throw error

  // 3. Also update verification_status in mechanic_profiles
  const { error: profileError } = await serviceSupabase
    .from('mechanic_profiles')
    .update({ verification_status: dbStatus })
    .eq('user_id', mechanicUserId)

  if (profileError) {
    console.error('[DB EXCEPTION] Failed to sync verification_status to mechanic_profiles:', profileError.message)
    throw profileError
  }

  return data && data.length > 0 ? data[0] : null
}

// ============================================================================
// 2. COMPREHENSIVE OVERVIEW STATS METRICS
// ============================================================================
export async function getAdminStats(serviceSupabase) {
  // 1. Fetch Rescue Metrics counters concurrently
  const [
    { count: totalRequests }, 
    { count: activeRequests }, 
    { count: completedRequests }, 
    { count: cancelledRequests }
  ] = await Promise.all([
    serviceSupabase.from('rescue_requests').select('*', { count: 'exact', head: true }),
    serviceSupabase.from('rescue_requests').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'en_route', 'arrived', 'in_progress']),
    serviceSupabase.from('rescue_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    serviceSupabase.from('rescue_requests').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ])

  // 2. Fetch Response & Latency Metrics data sets safely
  const { data: acceptedRequests } = await serviceSupabase
    .from('rescue_requests')
    .select('created_at, accepted_at')
    .not('accepted_at', 'is', null)
    .limit(1000)

  const { data: completedJobs } = await serviceSupabase
    .from('rescue_requests')
    .select('accepted_at, completed_at')
    .eq('status', 'completed')
    .not('accepted_at', 'is', null)
    .not('completed_at', 'is', null)
    .limit(1000)

  const avgResponseTime = acceptedRequests && acceptedRequests.length > 0
    ? acceptedRequests.reduce((sum, r) => sum + (new Date(r.accepted_at) - new Date(r.created_at)), 0) / acceptedRequests.length / 60000
    : 0

  const avgCompletionTime = completedJobs && completedJobs.length > 0
    ? completedJobs.reduce((sum, r) => sum + (new Date(r.completed_at) - new Date(r.accepted_at)), 0) / completedJobs.length / 60000
    : 0

  // 3. Fetch Mechanic Metrics via verified mapping schemas
  const [
    { count: verifiedMechanics }, 
    { count: totalMechanics }, 
    { count: activeMechanics },
    { count: pendingVerifications }
  ] = await Promise.all([
    serviceSupabase.from('mechanic_verifications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    serviceSupabase.from('mechanic_profiles').select('*', { count: 'exact', head: true }),
    serviceSupabase.from('mechanic_profiles').select('*', { count: 'exact', head: true }).eq('is_available', true),
    serviceSupabase.from('mechanic_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  // 4. Fetch Top Performing Mechanics ordered by rating metrics
  const { data: topMechanicsRaw } = await serviceSupabase
    .from('mechanic_profiles')
    .select('user_id, business_name, rating_avg, rating_count')
    .order('rating_avg', { ascending: false })
    .limit(5)

  // Fetch profile data for each top mechanic
  const topMechanics = await Promise.all(
    (topMechanicsRaw || []).map(async (mechanic) => {
      const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('id', mechanic.user_id)
        .maybeSingle()
      return {
        ...mechanic,
        profile: profile || null,
      }
    })
  )

  // 5. Fetch Total Drivers counter metrics
  const { count: totalDrivers } = await serviceSupabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'driver')

  // 6. Fetch Satisfaction Metrics from designated request_reviews table
  const { data: reviews } = await serviceSupabase
    .from('request_reviews')
    .select('rating')

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 5.0 

  const ratingsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  if (reviews) {
    reviews.forEach((r) => {
      const ratingVal = Math.round(r.rating)
      if (ratingsDistribution[ratingVal] !== undefined) ratingsDistribution[ratingVal]++
    })
  }

  // 7. Dynamic aggregations mapping incident breakdowns
  const { data: allRequestsForAggregation } = await serviceSupabase
    .from('rescue_requests')
    .select('service_type, status')

  const serviceTypeCounts = {}
  const statusCounts = {}

  if (allRequestsForAggregation) {
    allRequestsForAggregation.forEach((r) => {
      serviceTypeCounts[r.service_type] = (serviceTypeCounts[r.service_type] || 0) + 1
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    })
  }

  const serviceTypeBreakdown = Object.entries(serviceTypeCounts).map(([service_type, count]) => ({ service_type, count }))
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  // 8. Fetch active online mechanic locations and active incident coordinates in real-time
  const [activeLocationsResult, activeIncidentsResult] = await Promise.all([
    serviceSupabase
      .from('mechanic_profiles')
      .select(`
        user_id,
        business_name,
        current_location,
        is_available,
        profiles:user_id (
          full_name,
          phone,
          avatar_url
        )
      `)
      .eq('verification_status', 'approved')
      .eq('is_available', true),
    serviceSupabase
      .from('rescue_requests')
      .select(`
        id,
        status,
        service_type,
        problem_description,
        incident_location,
        mechanic_id
      `)
      .in('status', ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'])
  ])

  const activeMechanicLocations = activeLocationsResult.data || []
  const activeIncidents = activeIncidentsResult.data || []

  return {
    totalRequests: totalRequests || 0,
    activeRequests: activeRequests || 0,
    completedRequests: completedRequests || 0,
    cancelledRequests: cancelledRequests || 0,
    avgResponseTime: Number(avgResponseTime.toFixed(1)),
    avgCompletionTime: Number(avgCompletionTime.toFixed(1)),
    verifiedMechanics: verifiedMechanics || 0,
    activeMechanics: activeMechanics || 0,
    topMechanics: topMechanics || [],
    totalDrivers: totalDrivers || 0,
    avgRating: Number(avgRating.toFixed(2)),
    ratingsDistribution,
    serviceTypeBreakdown,
    statusBreakdown,
    totalUsers: (totalMechanics || 0) + (totalDrivers || 0),
    pendingVerifications: pendingVerifications || 0,
    activeMechanicLocations,
    activeIncidents,
  }
}

// ============================================================================
// 3. ALL RESCUE REQUESTS MANAGER (ADMIN MODULE)
// ============================================================================
export async function getAllRequests(serviceSupabase, { status, flagged, limit = 50, offset = 0 } = {}) {
  let selectStr = `
    *,
    driver:profiles!rescue_requests_driver_id_fkey (id, full_name, phone),
    mechanic:profiles!rescue_requests_mechanic_id_fkey (id, full_name, phone)
  `
  
  if (flagged) {
    selectStr += `, issue_reports!inner(id, comment)`
  } else {
    selectStr += `, issue_reports(id, comment)`
  }

  let query = serviceSupabase
    .from('rescue_requests')
    .select(selectStr)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'flagged') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// ============================================================================
// 4. USER IDENTITY ACCOUNT LISTS MANAGEMENT
// ============================================================================
export async function getAllUsers(serviceSupabase, { role, limit = 50, offset = 0 } = {}) {
  let query = serviceSupabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function suspendUser(serviceSupabase, userId) {
  const { error } = await serviceSupabase.auth.admin.deleteUser(userId)
  if (error) throw error
  return { success: true }
}