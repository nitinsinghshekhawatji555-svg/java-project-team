#!/usr/bin/env node

/**
 * scripts/collect-metrics.js
 *
 * Performance and Evaluation Data Collection Script for RoadRescue (Thesis Chapter).
 * Queries `request_metrics` and `rescue_requests` to calculate:
 * 1. Dispatch Latency: Average, Median, and p95 time from creation to first mechanic acceptance.
 * 2. Match Efficiency: Average and distribution of candidate mechanics per match.
 * 3. Lifecycle Completion Rate: Completed vs Cancelled vs Abandoned Pending requests.
 *
 * Usage:
 *   node scripts/collect-metrics.js
 *   or from web/: node ../scripts/collect-metrics.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// 1. Load environment variables from web/.env.local or process.env
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../web/.env.local'),
    path.resolve(__dirname, '../web/.env'),
    path.resolve(__dirname, '.env.local'),
    path.resolve(process.cwd(), 'web/.env.local'),
    path.resolve(process.cwd(), '.env.local'),
  ]

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      content.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=')
          const key = trimmed.slice(0, idx).trim()
          let val = trimmed.slice(idx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      })
      break
    }
  }
}

loadEnv()

// 2. Resolve @supabase/supabase-js
let createClient
try {
  const supabaseModule = await import('@supabase/supabase-js')
  createClient = supabaseModule.createClient
} catch {
  try {
    const supabaseModule = await import(path.resolve(__dirname, '../web/node_modules/@supabase/supabase-js/dist/main/index.js'))
    createClient = supabaseModule.createClient
  } catch {
    try {
      const supabaseModule = require(path.resolve(__dirname, '../web/node_modules/@supabase/supabase-js'))
      createClient = supabaseModule.createClient
    } catch (e) {
      console.error('Error loading @supabase/supabase-js. Please ensure dependencies are installed in ./web')
      process.exit(1)
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

// Math & Percentile Helpers
function calculatePercentile(sortedArr, percentile) {
  if (sortedArr.length === 0) return 0
  const index = (percentile / 100) * (sortedArr.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  if (upper === lower) return sortedArr[index]
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return 'N/A'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSec = Math.round(seconds % 60)
  return `${minutes}m ${remainingSec}s (${seconds.toFixed(1)}s)`
}

async function collectMetrics() {
  console.log('\n' + '='.repeat(70))
  console.log('  ROADRESCUE SYSTEM PERFORMANCE & DISPATCH EVALUATION METRICS')
  console.log('  Thesis Evaluation Data Collection Tool')
  console.log('  Endpoint:', supabaseUrl)
  console.log('  Timestamp:', new Date().toISOString())
  console.log('='.repeat(70) + '\n')

  // 1. Fetch from request_metrics table
  let metricsRows = []
  const { data: metricsData, error: metricsError } = await supabase
    .from('request_metrics')
    .select('*')
    .order('created_at', { ascending: false })

  if (!metricsError && metricsData && metricsData.length > 0) {
    metricsRows = metricsData
  } else {
    // Fallback: Query rescue_requests directly if request_metrics is newly migrated or empty
    const { data: reqData, error: reqError } = await supabase
      .from('rescue_requests')
      .select('id, status, created_at, accepted_at, completed_at, cancelled_at')
      .order('created_at', { ascending: false })

    if (reqError) {
      console.error('Failed to query request records:', reqError.message)
      process.exit(1)
    }

    metricsRows = (reqData || []).map((r) => ({
      request_id: r.id,
      created_at: r.created_at,
      accepted_at: r.accepted_at,
      completed_at: r.completed_at,
      cancelled_at: r.cancelled_at,
      candidate_mechanics_count: 0,
      status: r.status,
    }))
  }

  const totalRequests = metricsRows.length

  if (totalRequests === 0) {
    console.log('No request records found in the database. Run requests through the platform to generate metrics.\n')
    return
  }

  // --- 1. TIME TO FIRST MECHANIC ACCEPTANCE (DISPATCH LATENCY) ---
  const acceptanceDurations = [] // in seconds
  const matchToAcceptDurations = [] // in seconds

  metricsRows.forEach((row) => {
    if (row.created_at && row.accepted_at) {
      const created = new Date(row.created_at).getTime()
      const accepted = new Date(row.accepted_at).getTime()
      const diffSec = (accepted - created) / 1000
      if (diffSec >= 0) {
        acceptanceDurations.push(diffSec)
      }
    }

    if (row.matched_at && row.accepted_at) {
      const matched = new Date(row.matched_at).getTime()
      const accepted = new Date(row.accepted_at).getTime()
      const diffSec = (accepted - matched) / 1000
      if (diffSec >= 0) {
        matchToAcceptDurations.push(diffSec)
      }
    }
  })

  acceptanceDurations.sort((a, b) => a - b)

  const avgAcceptanceSec = acceptanceDurations.length
    ? acceptanceDurations.reduce((sum, v) => sum + v, 0) / acceptanceDurations.length
    : null
  const medianAcceptanceSec = acceptanceDurations.length ? calculatePercentile(acceptanceDurations, 50) : null
  const p95AcceptanceSec = acceptanceDurations.length ? calculatePercentile(acceptanceDurations, 95) : null
  const minAcceptanceSec = acceptanceDurations.length ? acceptanceDurations[0] : null
  const maxAcceptanceSec = acceptanceDurations.length ? acceptanceDurations[acceptanceDurations.length - 1] : null

  // --- 2. CANDIDATE MECHANICS FOUND AT MATCH TIME ---
  const candidatesCounts = metricsRows
    .map((r) => r.candidate_mechanics_count)
    .filter((c) => c !== null && c !== undefined)

  candidatesCounts.sort((a, b) => a - b)

  const avgCandidates = candidatesCounts.length
    ? candidatesCounts.reduce((sum, v) => sum + v, 0) / candidatesCounts.length
    : 0
  const medianCandidates = candidatesCounts.length ? calculatePercentile(candidatesCounts, 50) : 0
  const maxCandidates = candidatesCounts.length ? candidatesCounts[candidatesCounts.length - 1] : 0

  // --- 3. LIFECYCLE COMPLETION & RESOLUTION BREAKDOWN ---
  const statusCounts = {
    completed: 0,
    cancelled: 0,
    in_progress: 0,
    accepted_or_en_route: 0,
    pending: 0,
    other: 0,
  }

  const now = Date.now()
  let abandonedPendingCount = 0 // Pending for > 30 minutes without acceptance

  metricsRows.forEach((r) => {
    const status = (r.status || '').toLowerCase()
    if (status === 'completed') {
      statusCounts.completed++
    } else if (status === 'cancelled') {
      statusCounts.cancelled++
    } else if (status === 'in_progress' || status === 'arrived') {
      statusCounts.in_progress++
    } else if (status === 'accepted' || status === 'en_route') {
      statusCounts.accepted_or_en_route++
    } else if (status === 'pending') {
      statusCounts.pending++
      const ageMinutes = (now - new Date(r.created_at).getTime()) / (1000 * 60)
      if (ageMinutes > 30) {
        abandonedPendingCount++
      }
    } else {
      statusCounts.other++
    }
  })

  const completedRate = totalRequests ? ((statusCounts.completed / totalRequests) * 100).toFixed(1) : 0
  const cancelledRate = totalRequests ? ((statusCounts.cancelled / totalRequests) * 100).toFixed(1) : 0
  const pendingRate = totalRequests ? ((statusCounts.pending / totalRequests) * 100).toFixed(1) : 0
  const activeRate = totalRequests
    ? (((statusCounts.in_progress + statusCounts.accepted_or_en_route) / totalRequests) * 100).toFixed(1)
    : 0

  // Output formatting
  console.log('----------------------------------------------------------------------')
  console.log('1. DISPATCH LATENCY (Request Creation -> First Mechanic Acceptance)')
  console.log('----------------------------------------------------------------------')
  console.log(`  Sample Size (Accepted Requests) : ${acceptanceDurations.length} of ${totalRequests}`)
  console.log(`  Average Time to Acceptance      : ${formatDuration(avgAcceptanceSec)}`)
  console.log(`  Median (p50) Acceptance Time    : ${formatDuration(medianAcceptanceSec)}`)
  console.log(`  95th Percentile (p95) Time      : ${formatDuration(p95AcceptanceSec)}`)
  console.log(`  Min / Max Acceptance Time       : ${formatDuration(minAcceptanceSec)} / ${formatDuration(maxAcceptanceSec)}`)

  console.log('\n----------------------------------------------------------------------')
  console.log('2. CANDIDATE MECHANICS MATCH EFFICIENCY (get_nearby_verified_mechanics)')
  console.log('----------------------------------------------------------------------')
  console.log(`  Evaluated Requests              : ${candidatesCounts.length}`)
  console.log(`  Average Candidate Pool Size     : ${avgCandidates.toFixed(2)} mechanics/request`)
  console.log(`  Median Candidate Pool Size      : ${medianCandidates.toFixed(0)} mechanics`)
  console.log(`  Peak Match Candidate Pool Size  : ${maxCandidates} mechanics`)

  console.log('\n----------------------------------------------------------------------')
  console.log('3. REQUEST LIFECYCLE & COMPLETION RATES')
  console.log('----------------------------------------------------------------------')
  console.log(`  Total Evaluated Requests        : ${totalRequests}`)
  console.log(`  Completed Requests              : ${statusCounts.completed} (${completedRate}%)`)
  console.log(`  Cancelled Requests              : ${statusCounts.cancelled} (${cancelledRate}%)`)
  console.log(`  Active / In-Flight Jobs         : ${statusCounts.in_progress + statusCounts.accepted_or_en_route} (${activeRate}%)`)
  console.log(`  Pending / Searching Requests    : ${statusCounts.pending} (${pendingRate}%)`)
  console.log(`    - of which Abandoned (>30m)   : ${abandonedPendingCount} (${((abandonedPendingCount / totalRequests) * 100).toFixed(1)}%)`)

  console.log('\n' + '='.repeat(70))
  console.log('  SUMMARY TABLE (THESIS READY FORMAT)')
  console.log('='.repeat(70))
  console.table([
    { Metric: 'Sample Requests', Value: totalRequests, Unit: 'requests' },
    { Metric: 'Mean Creation-to-Accept', Value: avgAcceptanceSec ? avgAcceptanceSec.toFixed(2) : 'N/A', Unit: 'seconds' },
    { Metric: 'Median (p50) Acceptance', Value: medianAcceptanceSec ? medianAcceptanceSec.toFixed(2) : 'N/A', Unit: 'seconds' },
    { Metric: '95th Percentile (p95)', Value: p95AcceptanceSec ? p95AcceptanceSec.toFixed(2) : 'N/A', Unit: 'seconds' },
    { Metric: 'Avg Nearby Candidates', Value: avgCandidates.toFixed(2), Unit: 'mechanics' },
    { Metric: 'Completion Rate', Value: `${completedRate}%`, Unit: 'percentage' },
    { Metric: 'Cancellation Rate', Value: `${cancelledRate}%`, Unit: 'percentage' },
  ])
  console.log('\n')
}

collectMetrics().catch((err) => {
  console.error('Fatal error collecting metrics:', err)
  process.exit(1)
})
