/**
 * request.js — DEFINITIVE VERSION
 * All rescue request operations (create, update status, cancel, rate)
 *
 * These functions are called from API route handlers, NOT directly from components.
 * They handle:
 * - Request creation with geospatial matching
 * - Status transitions with validation
 * - Request cancellation with mechanic notifications
 * - Driver ratings with dynamic mechanic average calculation
 */

import { DEFAULT_SEARCH_RADIUS_KM, NOTIFICATION_TYPE, REQUEST_STATUS } from '@/lib/constants'
import { formatRequestRow, insertNotifications, isValidTransition, normalizeStatus } from '@/lib/rescueLifecycle'
import { sendNotificationEmail } from '@/lib/email'
import { recordMatchMetric } from '@/lib/metrics'

// ============================================================================
// CREATE RESCUE REQUEST
// ============================================================================
// Called from POST /api/requests
// - supabase: server client with user JWT context
// - serviceSupabase: service role client (bypasses RLS for notifications)
export async function createRescueRequest(supabase, serviceSupabase, payload) {
  const {
    driverId,
    incidentLat,
    incidentLng,
    incidentAddress,
    problemDescription,
    serviceType,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    vehiclePlate,
    aiDiagnosticResult,
  } = payload

  const targetMechanicId = payload.target_mechanic_id || payload.targetMechanicId || payload.preferredMechanicId || payload.preferred_mechanic_id || null

  // Extract vehicle image URL from payload (passed as vehicle_image_url)
  const vehicleImageUrl = payload.vehicle_image_url || payload.vehicleImageUrl || null

  try {
    // 1. Insert the rescue request row (locking mechanic_id if targeted dispatch)
    const { data: request, error: requestError } = await supabase
      .from('rescue_requests')
      .insert({
        driver_id: driverId,
        mechanic_id: targetMechanicId || null,
        status: REQUEST_STATUS.PENDING,
        service_type: serviceType,
        // PostGIS requires POINT(longitude, latitude) — lng first, always
        incident_location: `POINT(${incidentLng} ${incidentLat})`,
        incident_address: incidentAddress,
        problem_description: problemDescription,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear,
        vehicle_color: vehicleColor,
        vehicle_plate: vehiclePlate,
        vehicle_image_url: vehicleImageUrl,
        ai_diagnostic_result: aiDiagnosticResult || null,
      })
      .select()
      .single()

    if (requestError) throw requestError

    // Lock target mechanic availability state immediately to avoid double-booking
    if (targetMechanicId && serviceSupabase) {
      await serviceSupabase
        .from('mechanic_profiles')
        .update({ is_available: false, current_status: 'dispatched' })
        .eq('user_id', targetMechanicId)
    }

    let targetMechanics = []

    // 2. Dispatch routing
    if (targetMechanicId) {
      const { data: preferredMech, error: mechErr } = await (serviceSupabase || supabase)
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', targetMechanicId)
        .maybeSingle()

      if (!mechErr && preferredMech) {
        targetMechanics = [{
          user_id: preferredMech.id,
          full_name: preferredMech.full_name || 'Mechanic',
          email: preferredMech.email,
          distance_km: 'Direct',
        }]
      }
    } else {
      // Find nearby mechanics using PostGIS geospatial function
      const { data: nearbyMechanics, error: matchError } = await supabase.rpc('get_nearby_verified_mechanics', {
        lat: incidentLat,
        lng: incidentLng,
        radius_km: DEFAULT_SEARCH_RADIUS_KM,
      })

      if (matchError) throw matchError
      targetMechanics = nearbyMechanics || []
    }

    // Record performance metric for thesis evaluation
    recordMatchMetric({
      supabaseClient: serviceSupabase || supabase,
      requestId: request.id,
      candidateCount: targetMechanics.length,
      matchedAt: new Date().toISOString(),
    })

    // 3. If no mechanics found, still return request (driver sees "searching" state)
    if (!targetMechanics || targetMechanics.length === 0) {
      return { request, notifiedCount: 0 }
    }

    // 4. Send email notifications (non-blocking, best-effort)
    targetMechanics.forEach((mechanic) => {
      sendNotificationEmail({
        to: mechanic.email || `mechanic-${mechanic.user_id}@roadrescue.com`,
        subject: targetMechanicId
          ? `Direct ${serviceType} Request from Driver!`
          : `New ${serviceType} Request ${mechanic.distance_km}km away!`,
        type: 'new_request',
        data: {
          mechanicName: mechanic.full_name,
          issueDescription: problemDescription,
          location: incidentAddress || 'Location pinned',
          distance: typeof mechanic.distance_km === 'number' ? `${mechanic.distance_km} km` : `${mechanic.distance_km}`,
          appUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://roadrescue-gh.vercel.app'}/dashboard/mechanic/job/${request.id}`,
        },
      }).catch((err) => {
        console.warn(`Email failed for mechanic ${mechanic.user_id}:`, err)
      })
    })

    return { request, notifiedCount: targetMechanics.length }
  } catch (error) {
    console.error('Error creating rescue request:', error)
    throw error
  }
}

// ============================================================================
// UPDATE REQUEST STATUS
// ============================================================================
// All rescue status transitions are validated server-side.
// Clients must call PATCH /api/requests/status instead of updating Supabase directly.
export async function updateRequestStatus(serviceSupabase, payload) {
  const {
    requestId,
    actorId,
    actorRole,
    newStatus: rawNewStatus,
    completionNotes,
    performedServices,
    cancellationReason,
  } = payload

  const newStatus = normalizeStatus(rawNewStatus)
  const knownStatuses = new Set(Object.values(REQUEST_STATUS))

  async function fetchRequestDetails(requestIdToFetch) {
    const { data: request, error: requestError } = await serviceSupabase
      .from('rescue_requests')
      .select('*')
      .eq('id', requestIdToFetch)
      .maybeSingle()

    if (requestError) throw requestError
    if (!request) throw new Error('Request not found')

    const { data: driver } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url')
      .eq('id', request.driver_id)
      .maybeSingle()

    const mechanicPromise = request.mechanic_id
      ? serviceSupabase
          .from('profiles')
          .select('id, full_name, phone, avatar_url')
          .eq('id', request.mechanic_id)
          .maybeSingle()
      : Promise.resolve({ data: null })

    const mechanicProfilePromise = request.mechanic_id
      ? serviceSupabase
          .from('mechanic_profiles')
          .select('rating_avg, rating_count, business_name, specializations, location_label, is_available, current_status')
          .eq('user_id', request.mechanic_id)
          .maybeSingle()
      : Promise.resolve({ data: null })

    const [mechanic, mechanicProfile] = await Promise.all([
      mechanicPromise,
      mechanicProfilePromise,
    ])

    const assignedMechanic = mechanic?.data
      ? {
          ...mechanic.data,
          mechanic_profiles: mechanicProfile?.data
            ? {
                business_name: mechanicProfile.data.business_name,
                location_label: mechanicProfile.data.location_label,
                is_available: mechanicProfile.data.is_available,
                current_status: mechanicProfile.data.current_status,
              }
            : null,
        }
      : null

    return formatRequestRow(request, {
      driver: driver
        ? {
            id: driver.id,
            full_name: driver.full_name,
            phone: driver.phone,
            avatar_url: driver.avatar_url,
          }
        : null,
      assignedMechanic,
    })
  }

  try {
    if (!requestId) {
      throw new Error('requestId is required')
    }

    if (!actorId || !actorRole) {
      throw new Error('actorId and actorRole are required')
    }

    if (!knownStatuses.has(newStatus)) {
      throw new Error('Invalid status')
    }

    const { data: request, error: fetchError } = await serviceSupabase
      .from('rescue_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!request) throw new Error('Request not found')

    const isAcceptedTransition = newStatus === REQUEST_STATUS.ACCEPTED
    const isCancelledTransition = newStatus === REQUEST_STATUS.CANCELLED

    if (isAcceptedTransition) {
      if (actorRole !== 'mechanic' && actorRole !== 'admin') {
        throw new Error('Only mechanics can accept requests')
      }

      if (actorRole === 'mechanic') {
        const { data: mechProfile, error: mechErr } = await serviceSupabase
          .from('mechanic_profiles')
          .select('verification_status')
          .eq('user_id', actorId)
          .maybeSingle()

        if (mechErr) throw mechErr

        const verificationStatus = mechProfile?.verification_status || 'pending'

        if (verificationStatus !== 'approved') {
          throw new Error('Mechanic account is not verified to accept requests')
        }
      }

      if (request.status !== REQUEST_STATUS.PENDING && request.status !== REQUEST_STATUS.OFFERED) {
        throw new Error('Request is no longer available')
      }

      if (request.mechanic_id && request.mechanic_id !== actorId) {
        throw new Error('Another mechanic already accepted this request')
      }
    } else {
      if (actorRole !== 'mechanic' && actorRole !== 'admin' && actorRole !== 'driver') {
        throw new Error('Not authorized to update rescue status')
      }

      if (isCancelledTransition) {
        const isDriverOwner = actorRole === 'driver' && request.driver_id === actorId
        const isAssignedMechanic = actorRole === 'mechanic' && request.mechanic_id === actorId
        const isAdmin = actorRole === 'admin'
        const isSystem = actorRole === 'system'

        if (!isDriverOwner && !isAssignedMechanic && !isAdmin && !isSystem) {
          throw new Error('Not authorized to cancel this request')
        }

        if (isDriverOwner) {
          const allowedDriverStatuses = [
            REQUEST_STATUS.PENDING,
            REQUEST_STATUS.OFFERED,
            REQUEST_STATUS.ACCEPTED,
            REQUEST_STATUS.EN_ROUTE,
          ]
          if (!allowedDriverStatuses.includes(request.status)) {
            throw new Error('Drivers cannot cancel a request once the mechanic has arrived on-site or work is in progress')
          }
        }

        if (isAssignedMechanic) {
          const allowedMechanicStatuses = [
            REQUEST_STATUS.PENDING,
            REQUEST_STATUS.OFFERED,
            REQUEST_STATUS.ACCEPTED,
            REQUEST_STATUS.EN_ROUTE,
            REQUEST_STATUS.ARRIVED,
          ]
          if (!allowedMechanicStatuses.includes(request.status)) {
            throw new Error('Mechanics cannot cancel a request once work is in progress. Please submit an issue report or follow the dispute resolution path.')
          }
          if (!cancellationReason || !cancellationReason.trim()) {
            throw new Error('A cancellation reason is required for mechanic cancellations')
          }
        }

        if (isSystem) {
          if (request.status === REQUEST_STATUS.COMPLETED || request.status === REQUEST_STATUS.CANCELLED) {
            throw new Error('Cannot auto-cancel a request that is already terminal')
          }
        }
      } else {
        if (actorRole !== 'mechanic' && actorRole !== 'admin') {
          throw new Error('Only mechanics can update rescue status')
        }

        if (request.mechanic_id !== actorId && actorRole !== 'admin') {
          throw new Error('Not authorized — you do not own this request')
        }
      }
    }

    if (!isValidTransition(request.status, newStatus)) {
      throw new Error(
        `Cannot transition from ${request.status} to ${newStatus} — invalid state change`
      )
    }

    // ============================================================================
    // STATE TRANSITION WRITE
    // ============================================================================
    const updatePayload = { status: newStatus }

    if (newStatus === REQUEST_STATUS.ACCEPTED) {
      if (request.mechanic_id && request.mechanic_id !== 'null' && request.mechanic_id !== actorId) {
        throw new Error('Another mechanic already accepted this request')
      }
      updatePayload.mechanic_id = actorId
      updatePayload.accepted_at = new Date().toISOString()
    }

    if (newStatus === REQUEST_STATUS.EN_ROUTE) {
      updatePayload.en_route_at = request.en_route_at ?? new Date().toISOString()
    }

    if (newStatus === REQUEST_STATUS.ARRIVED) {
      updatePayload.arrived_at = request.arrived_at ?? new Date().toISOString()
    }

    if (newStatus === REQUEST_STATUS.IN_PROGRESS) {
      updatePayload.started_at = request.started_at ?? new Date().toISOString()
    }

    if (newStatus === REQUEST_STATUS.COMPLETED) {
      updatePayload.completed_at = new Date().toISOString()
      if (completionNotes) updatePayload.completion_notes = completionNotes
      if (performedServices?.length) updatePayload.performed_services = performedServices
    }

    if (newStatus === REQUEST_STATUS.CANCELLED) {
      updatePayload.cancelled_at = new Date().toISOString()
      updatePayload.cancelled_by = actorId
      updatePayload.cancellation_reason = cancellationReason || null
    }

    // Use .select() with atomic precondition matching the pre-fetched request.status.
    // If another actor or process changed the state in the database between the read and write,
    // updatedRows will return empty (0 rows affected), preventing lost updates / double-acceptance.
    const { data: updatedRows, error: updateError } = await serviceSupabase
      .from('rescue_requests')
      .update(updatePayload)
      .eq('id', requestId)
      .eq('status', request.status)
      .select('id, status, mechanic_id')

    if (updateError) {
      console.error('[updateRequestStatus] DB update error:', updateError)
      throw updateError
    }

    // 0 rows updated = State was mutated concurrently by another actor or RLS blocked
    if (!updatedRows || updatedRows.length === 0) {
      const { data: currentRow } = await serviceSupabase
        .from('rescue_requests')
        .select('id, status, mechanic_id')
        .eq('id', requestId)
        .maybeSingle()

      console.warn('[updateRequestStatus] 0 rows affected (concurrent modification). Current row:', currentRow)

      if (!currentRow) {
        throw new Error(`Request ${requestId} not found — cannot update status`)
      }

      if (newStatus === REQUEST_STATUS.ACCEPTED && currentRow.status !== REQUEST_STATUS.PENDING) {
        throw new Error('This rescue request was already accepted by another mechanic or is no longer available.')
      }

      throw new Error(
        `Status transition conflict: request status changed before this update could be applied (current: "${currentRow.status}", attempted: "${newStatus}").`
      )
    }

    const verifiedRequest = updatedRows[0]

    if (verifiedRequest.status !== newStatus) {
      throw new Error(
        `Status write failed: expected "${newStatus}" but database has "${verifiedRequest.status}"`
      )
    }

    // ── FIX 1: mechanic availability update ──
    if (newStatus === REQUEST_STATUS.ACCEPTED) {
      await serviceSupabase
        .from('mechanic_profiles')
        .update({ is_available: true, current_status: null })
        .eq('user_id', actorId)
        .then(({ error: availabilityError }) => {
          if (availabilityError) console.warn('Failed to mark mechanic online:', availabilityError)
        })
    }

    if (
      request.mechanic_id &&
      (newStatus === REQUEST_STATUS.COMPLETED || newStatus === REQUEST_STATUS.CANCELLED)
    ) {
      await serviceSupabase
        .from('mechanic_profiles')
        .update({ is_available: true, current_status: null })
        .eq('user_id', request.mechanic_id)
        .then(({ error: availabilityError }) => {
          if (availabilityError) console.warn('Failed to release mechanic:', availabilityError)
        })
    }

    // Notifications are handled automatically by database trigger trg_rescue_request_lifecycle_notifications

    // ── Email sends — non-blocking best-effort ──
    if (newStatus === REQUEST_STATUS.ACCEPTED) {
      const { data: driver } = await serviceSupabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', request.driver_id)
        .single()

      if (driver?.email) {
        sendNotificationEmail({
          to: driver.email,
          subject: 'Mechanic Accepted Your Rescue Request',
          type: 'mechanic_accepted',
          data: {
            driverName: driver.full_name,
            mechanicName: actorRole === 'admin' ? 'An admin' : 'A mechanic',
            location: request.incident_address || 'Rescue location',
            appUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://roadrescue-gh.vercel.app'}/dashboard/driver/request/${requestId}`,
          },
        }).catch((err) => console.warn('Email send failed:', err))
      }
    }

    if (newStatus === REQUEST_STATUS.CANCELLED) {
      if (request.mechanic_id && request.driver_id === actorId) {
        const { data: mechanic } = await serviceSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', request.mechanic_id)
          .single()

        if (mechanic?.email) {
          sendNotificationEmail({
            to: mechanic.email,
            subject: 'ℹ️ Rescue Request Cancelled',
            type: 'request_cancelled',
            data: {
              mechanicName: mechanic.full_name,
              reason: cancellationReason || 'No reason provided',
              appUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://roadrescue-gh.vercel.app'}/requests`,
            },
          }).catch((err) => console.warn('Email send failed:', err))
        }
      }

      if (request.driver_id && request.mechanic_id === actorId) {
        const { data: driver } = await serviceSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', request.driver_id)
          .single()

        if (driver?.email) {
          sendNotificationEmail({
            to: driver.email,
            subject: 'ℹ️ Your Rescue Request Was Cancelled',
            type: 'request_cancelled',
            data: {
              driverName: driver.full_name,
              reason: 'Assigned mechanic cancelled the request',
              appUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://roadrescue-gh.vercel.app'}/requests`,
            },
          }).catch((err) => console.warn('Email send failed:', err))
        }
      }
    }

    // Single, correct final return
    return {
      success: true,
      request: await fetchRequestDetails(requestId),
      newStatus,
    }
  } catch (error) {
    console.error('Error updating request status:', error)
    throw error
  }
}

// ============================================================================
// CANCEL REQUEST
// ============================================================================
export async function cancelRequest(serviceSupabase, payload) {
  const { requestId, driverId, reason } = payload

  return updateRequestStatus(serviceSupabase, {
    requestId,
    actorId: driverId,
    actorRole: 'driver',
    newStatus: REQUEST_STATUS.CANCELLED,
    cancellationReason: reason ? `user: ${reason}` : 'user: driver cancelled request',
  })
}

// ============================================================================
// SYSTEM / TIMEOUT AUTO-CANCEL REQUEST
// ============================================================================
export async function systemAutoCancelRequest(serviceSupabase, payload) {
  const { requestId, reason } = payload

  return updateRequestStatus(serviceSupabase, {
    requestId,
    actorId: 'system',
    actorRole: 'system',
    newStatus: REQUEST_STATUS.CANCELLED,
    cancellationReason: reason ? `system_timeout: ${reason}` : 'system_timeout: mechanic inactivity timeout',
  })
}

// ============================================================================
// SUBMIT DRIVER RATING
// ============================================================================
export async function submitRating(supabase, payload) {
  const { requestId, driverId, rating, review } = payload

  try {
    const { data: request, error: requestError } = await supabase
      .from('rescue_requests')
      .select('id, driver_id, mechanic_id, status')
      .eq('id', requestId)
      .eq('driver_id', driverId)
      .eq('status', REQUEST_STATUS.COMPLETED)
      .maybeSingle()

    if (requestError) throw requestError
    if (!request) throw new Error('Request not found or not completed')

    const { error: insertError } = await supabase
      .from('request_reviews')
      .insert({
        request_id: requestId,
        driver_id: driverId,
        mechanic_id: request.mechanic_id,
        rating: Math.max(1, Math.min(5, rating)),
        review: review || null,
      })

    if (insertError) throw insertError

    const { data: allReviews, error: fetchError } = await supabase
      .from('request_reviews')
      .select('rating')
      .eq('mechanic_id', request.mechanic_id)

    if (fetchError) throw fetchError

    const avgRating =
      allReviews && allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0

    const { error: updateError } = await supabase
      .from('mechanic_profiles')
      .update({
        rating_avg: Math.round(avgRating * 100) / 100,
        rating_count: allReviews?.length || 0,
      })
      .eq('user_id', request.mechanic_id)

    if (updateError) throw updateError

    try {
      await insertNotifications(supabase, [{
        profile_id: driverId,
        type: NOTIFICATION_TYPE.SYSTEM,
        title: 'Rating Submitted',
        body: `Your review of ${rating} stars was successfully recorded. Thank you for your feedback!`,
        request_id: requestId,
      }])
    } catch (e) {
      console.warn('Failed to insert rating notification for driver:', e)
    }

    return { success: true, newAvgRating: Math.round(avgRating * 100) / 100 }
  } catch (error) {
    console.error('Error submitting rating:', error)
    throw error
  }
}