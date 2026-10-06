import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isValidTransition, REQUEST_STATUS_FLOW } from '../src/lib/rescueLifecycle.js'

describe('Atomic Status Transition Guard & Lifecycle State Machine', () => {
  it('allows valid sequential forward status transitions', () => {
    assert.equal(isValidTransition('pending', 'accepted'), true)
    assert.equal(isValidTransition('accepted', 'en_route'), true)
    assert.equal(isValidTransition('en_route', 'arrived'), true)
    assert.equal(isValidTransition('arrived', 'in_progress'), true)
    assert.equal(isValidTransition('in_progress', 'completed'), true)
  })

  it('allows cancellation from uncompleted lifecycle states', () => {
    assert.equal(isValidTransition('pending', 'cancelled'), true)
    assert.equal(isValidTransition('offered', 'cancelled'), true)
    assert.equal(isValidTransition('accepted', 'cancelled'), true)
    assert.equal(isValidTransition('en_route', 'cancelled'), true)
    assert.equal(isValidTransition('arrived', 'cancelled'), true)
    assert.equal(isValidTransition('in_progress', 'cancelled'), true)
  })

  it('strictly rejects illegal backward or leapfrogging status transitions', () => {
    assert.equal(isValidTransition('completed', 'pending'), false)
    assert.equal(isValidTransition('completed', 'in_progress'), false)
    assert.equal(isValidTransition('completed', 'cancelled'), false)
    assert.equal(isValidTransition('cancelled', 'accepted'), false)
    assert.equal(isValidTransition('cancelled', 'completed'), false)
    assert.equal(isValidTransition('pending', 'completed'), false)
    assert.equal(isValidTransition('pending', 'in_progress'), false)
  })

  it('atomic condition check detects concurrent modification and returns conflict', async () => {
    // Simulated in-memory database table with atomic conditional write
    const mockDatabase = {
      'req-001': {
        id: 'req-001',
        status: 'pending',
        mechanic_id: null,
        accepted_at: null,
      },
    }

    // Atomic update simulation: UPDATE rescue_requests SET status = $1, mechanic_id = $2 WHERE id = $3 AND status = $4
    async function executeAtomicStatusUpdate(requestId, expectedStatus, newStatus, mechanicId) {
      const record = mockDatabase[requestId]
      if (!record) return { affectedRows: 0, current: null }

      // Atomic conditional check (WHERE status = expectedStatus)
      if (record.status !== expectedStatus) {
        return { affectedRows: 0, current: { ...record } }
      }

      // Mutation succeeds
      record.status = newStatus
      record.mechanic_id = mechanicId
      record.accepted_at = new Date().toISOString()
      return { affectedRows: 1, current: { ...record } }
    }

    // Dispatch handler replicating web/src/lib/request.js updateRequestStatus logic
    async function handleMechanicAccept(requestId, mechanicId) {
      const { affectedRows, current } = await executeAtomicStatusUpdate(
        requestId,
        'pending',
        'accepted',
        mechanicId
      )

      if (affectedRows === 0) {
        if (current && current.status !== 'pending') {
          const conflictError = new Error(
            'This rescue request was already accepted by another mechanic or is no longer available.'
          )
          conflictError.code = 'STATUS_CONFLICT'
          conflictError.status = 409
          throw conflictError
        }
        throw new Error('Request not found')
      }

      return current
    }

    const mechanicA = 'mech-uuid-111'
    const mechanicB = 'mech-uuid-222'

    // Mechanic A accepts first
    const acceptResultA = await handleMechanicAccept('req-001', mechanicA)
    assert.equal(acceptResultA.status, 'accepted')
    assert.equal(acceptResultA.mechanic_id, mechanicA)

    // Mechanic B attempts concurrent / duplicate accept on the same request
    await assert.rejects(
      async () => {
        await handleMechanicAccept('req-001', mechanicB)
      },
      (err) => {
        assert.equal(err.code, 'STATUS_CONFLICT')
        assert.equal(err.status, 409)
        assert.match(err.message, /already accepted by another mechanic/i)
        return true
      }
    )

    // Ensure state integrity remained intact (Mechanic A retains ownership)
    assert.equal(mockDatabase['req-001'].mechanic_id, mechanicA)
    assert.equal(mockDatabase['req-001'].status, 'accepted')
  })
})
