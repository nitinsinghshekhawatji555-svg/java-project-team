/**
 * Lightweight performance metrics instrumentation for RoadRescue
 * Used to collect thesis evaluation data on dispatch latency, match efficiency, and request lifecycles.
 */

export async function recordMatchMetric({
  supabaseClient,
  requestId,
  candidateCount = 0,
  matchedAt = null,
}) {
  if (!supabaseClient || !requestId) return

  try {
    const timestamp = matchedAt || new Date().toISOString()
    const { error } = await supabaseClient
      .from('request_metrics')
      .upsert(
        {
          request_id: requestId,
          matched_at: timestamp,
          candidate_mechanics_count: Number(candidateCount) || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'request_id' }
      )

    if (error) {
      console.warn('[METRICS INSTRUMENTATION]: Non-fatal metric record warning:', error.message)
    }
  } catch (err) {
    console.warn('[METRICS INSTRUMENTATION]: Non-fatal metric record exception:', err?.message || err)
  }
}
