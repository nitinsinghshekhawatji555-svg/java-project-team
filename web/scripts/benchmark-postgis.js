/**
 * ==============================================================================
 * PostGIS Spatial Query Latency Benchmark (RoadRescue FYP Evaluation)
 * ==============================================================================
 *
 * SCOPE AND METHODOLOGICAL BOUNDARIES (Academic Disclosures):
 * ------------------------------------------------------------------------------
 * WHAT THIS SCRIPT TESTS:
 * 1. Single-client, sequential round-trip execution latency of the PostGIS
 *    spatial stored procedure `get_nearby_verified_mechanics(lat, lng, radius_km)`.
 * 2. Realistic geospatial queries simulating roadside dispatch origin points
 *    across Accra, Kumasi, and Takoradi corridors.
 * 3. Statistical distribution (Min, Mean, Median, P95, Max, StdDev) of 
 *    application-to-database RPC latency under baseline conditions.
 *
 * WHAT THIS SCRIPT DOES NOT TEST:
 * 1. Multi-tenant concurrent load, thread saturation, or race conditions.
 * 2. Supabase / pgBouncer connection pool starvation under 100+ parallel requests.
 * 3. Extreme distributed network jitter or cross-region CDN edge caching.
 * ------------------------------------------------------------------------------
 *
 * Usage:
 *   node web/scripts/benchmark-postgis.js [--iterations 50] [--radius 10]
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local or .env if present
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const firstEqual = trimmed.indexOf('=');
          const key = trimmed.slice(0, firstEqual).trim();
          let val = trimmed.slice(firstEqual + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
      break;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[-] Error: Supabase URL and Key must be defined in environment or .env.local');
  console.error('    Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Sample test coordinates across Ghana urban and transit corridors
const TEST_LOCATIONS = [
  { name: 'Accra Central (Circle)', lat: 5.55602, lng: -0.20124 },
  { name: 'Accra East Legon', lat: 5.6358, lng: -0.1584 },
  { name: 'Accra Tema Motorway', lat: 5.6738, lng: -0.0194 },
  { name: 'Kumasi Kejetia', lat: 6.6961, lng: -1.6244 },
  { name: 'Takoradi Market Circle', lat: 4.8931, lng: -1.7554 },
];

function parseArgs() {
  const args = process.argv.slice(2);
  let iterations = 50;
  let radius = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--iterations' && args[i + 1]) {
      iterations = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--radius' && args[i + 1]) {
      radius = parseFloat(args[i + 1]);
      i++;
    }
  }

  return { iterations, radius };
}

function calculatePercentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

async function runBenchmark() {
  const { iterations, radius } = parseArgs();

  console.log('================================================================');
  console.log('RoadRescue FYP — PostGIS Query Latency Evaluation');
  console.log('================================================================');
  console.log(`Target Function   : public.get_nearby_verified_mechanics(lat, lng, radius_km)`);
  console.log(`Iterations        : ${iterations}`);
  console.log(`Search Radius     : ${radius} km`);
  console.log(`Target Endpoint   : ${supabaseUrl}`);
  console.log('----------------------------------------------------------------');
  console.log('Beginning sequential query benchmark...\n');

  const latencies = [];
  const errors = [];
  let totalMechanicsFound = 0;

  // Warm-up query (discarded from benchmark dataset)
  try {
    process.stdout.write('[*] Performing 1 warm-up query... ');
    const warmStart = performance.now();
    await supabase.rpc('get_nearby_verified_mechanics', {
      lat: TEST_LOCATIONS[0].lat,
      lng: TEST_LOCATIONS[0].lng,
      radius_km: radius,
    });
    const warmDuration = (performance.now() - warmStart).toFixed(2);
    console.log(`Done (${warmDuration} ms)\n`);
  } catch (err) {
    console.warn(`Warm-up warning: ${err.message}\n`);
  }

  // Execution loop
  for (let i = 0; i < iterations; i++) {
    const loc = TEST_LOCATIONS[i % TEST_LOCATIONS.length];
    const start = performance.now();
    
    try {
      const { data, error } = await supabase.rpc('get_nearby_verified_mechanics', {
        lat: loc.lat,
        lng: loc.lng,
        radius_km: radius,
      });

      const duration = performance.now() - start;

      if (error) {
        errors.push({ iteration: i + 1, error: error.message });
      } else {
        latencies.push(duration);
        totalMechanicsFound += Array.isArray(data) ? data.length : 0;
      }
    } catch (err) {
      errors.push({ iteration: i + 1, error: err.message });
    }

    if ((i + 1) % 10 === 0 || i + 1 === iterations) {
      process.stdout.write(`    Progress: ${i + 1}/${iterations} iterations completed\r`);
    }
  }

  console.log('\n\n================================================================');
  console.log('BENCHMARK EVALUATION RESULTS');
  console.log('================================================================');

  if (latencies.length === 0) {
    console.error('All benchmark queries failed. Errors:');
    console.error(errors);
    return;
  }

  latencies.sort((a, b) => a - b);

  const count = latencies.length;
  const min = latencies[0];
  const max = latencies[count - 1];
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const median = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);

  const variance = latencies.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  console.log(`Successful Queries : ${count}/${iterations} (${((count / iterations) * 100).toFixed(1)}%)`);
  console.log(`Failed Queries     : ${errors.length}`);
  console.log(`Avg Mechanics Found: ${(totalMechanicsFound / count).toFixed(2)} per query`);
  console.log('----------------------------------------------------------------');
  console.log(`Minimum Latency    : ${min.toFixed(2)} ms`);
  console.log(`Mean Latency       : ${mean.toFixed(2)} ms`);
  console.log(`Median (P50)       : ${median.toFixed(2)} ms`);
  console.log(`95th Percentile    : ${p95.toFixed(2)} ms`);
  console.log(`99th Percentile    : ${p99.toFixed(2)} ms`);
  console.log(`Maximum Latency    : ${max.toFixed(2)} ms`);
  console.log(`Std Deviation      : ${stdDev.toFixed(2)} ms`);
  console.log('================================================================');
  console.log('\nSummary for Chapter 5 / Presentation Slide:');
  console.log(`"The PostGIS spatial indexing procedure evaluated across ${iterations} sequential`);
  console.log(`geospatial dispatches yielded a median round-trip latency of ${median.toFixed(2)} ms`);
  console.log(`(P95: ${p95.toFixed(2)} ms, mean: ${mean.toFixed(2)} ms, σ: ${stdDev.toFixed(2)} ms)."`);
  console.log('================================================================\n');
}

runBenchmark();
