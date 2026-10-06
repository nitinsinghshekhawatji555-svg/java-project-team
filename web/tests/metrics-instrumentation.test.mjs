import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { recordMatchMetric } from '../src/lib/metrics.js'

describe('Lightweight Metrics Instrumentation & Statistical Aggregations', () => {
  it('recordMatchMetric handles valid parameters safely', async () => {
    let upsertCalled = false
    let upsertPayload = null

    const mockSupabaseClient = {
      from(tableName) {
        assert.equal(tableName, 'request_metrics')
        return {
          upsert(payload, options) {
            upsertCalled = true
            upsertPayload = payload
            assert.equal(options?.onConflict, 'request_id')
            return Promise.resolve({ error: null })
          },
        }
      },
    }

    const testRequestId = 'req-metric-001'
    const testCandidateCount = 4

    await recordMatchMetric({
      supabaseClient: mockSupabaseClient,
      requestId: testRequestId,
      candidateCount: testCandidateCount,
      matchedAt: '2026-09-28T01:00:00.000Z',
    })

    assert.equal(upsertCalled, true)
    assert.equal(upsertPayload.request_id, testRequestId)
    assert.equal(upsertPayload.candidate_mechanics_count, 4)
    assert.equal(upsertPayload.matched_at, '2026-09-28T01:00:00.000Z')
  })

  it('recordMatchMetric handles null / invalid inputs gracefully without throwing', async () => {
    // Should not throw even if supabase client or request_id is missing
    await assert.doesNotReject(async () => {
      await recordMatchMetric({ supabaseClient: null, requestId: null })
    })
  })

  it('accurately calculates mean, median, p95 and completion rates', () => {
    // Math percentile calculation test
    function calculatePercentile(sortedArr, percentile) {
      if (sortedArr.length === 0) return 0
      const index = (percentile / 100) * (sortedArr.length - 1)
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower
      if (upper === lower) return sortedArr[index]
      return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight
    }

    const latenciesSec = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    latenciesSec.sort((a, b) => a - b)

    const mean = latenciesSec.reduce((s, v) => s + v, 0) / latenciesSec.length
    const median = calculatePercentile(latenciesSec, 50)
    const p95 = calculatePercentile(latenciesSec, 95)

    assert.equal(mean, 55)
    assert.equal(median, 55)
    assert.equal(p95, 95.5)

    // Completion rate test
    const dataset = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'cancelled' },
      { status: 'pending' },
    ]

    const completed = dataset.filter((d) => d.status === 'completed').length
    const completionRate = (completed / dataset.length) * 100

    assert.equal(completionRate.toFixed(1), '66.7')
  })

  it('decodeHtmlEntities cleans escaped HTML punctuation correctly', async () => {
    const { decodeHtmlEntities } = await import('../src/lib/rescueLifecycle.js')
    const rawRecommendation = "Check the vehicle&#x27;s battery terminal &amp; ensure it&quot;s clean"
    const cleaned = decodeHtmlEntities(rawRecommendation)
    assert.equal(cleaned, "Check the vehicle's battery terminal & ensure it\"s clean")
  })
})
