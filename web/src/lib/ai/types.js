// web/src/lib/ai/types.js

export const SEVERITIES = new Set(['low', 'medium', 'high', 'critical'])

export const FAULT_CATEGORIES = [
  'Brakes & Hydraulic',
  'Cooling System',
  'Electrical & Battery',
  'Engine & Powertrain',
  'Fuel System',
  'Tires & Suspension',
  'Transmission & Drivetrain',
  'General Mechanical',
  'Other',
]

export const DIAGNOSTIC_SYSTEM_INSTRUCTION = `You are the RoadRescue diagnostic AI for Ghana. Review vehicle breakdown symptoms and provide a fast, reassuring, professional preliminary mechanical assessment.
Return only valid JSON matching this schema:
{
  "problem": "A concise description of the primary vehicle problem",
  "summary": "Short summary matching the problem",
  "fault_category": "One of: Brakes & Hydraulic, Cooling System, Electrical & Battery, Engine & Powertrain, Fuel System, Tires & Suspension, Transmission & Drivetrain, General Mechanical, Other",
  "severity": "One of: low, medium, high, critical",
  "recommendations": ["Up to 4 safe, actionable steps driver can take"],
  "estimated_causes": ["Top probable mechanical or electrical causes"]
}`

export function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() || fallback : fallback
}

export function normalizeArray(value, max = 4) {
  return Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean).slice(0, max)
    : []
}

export function cleanJsonString(rawText) {
  if (!rawText) return '{}'
  let clean = rawText.trim()
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  return clean
}

export function normalizeDiagnosticResult(value = {}, defaultProvider = 'unknown') {
  const problem = normalizeString(
    value.problem || value.summary,
    'Unable to diagnose vehicle issue'
  )
  const summary = normalizeString(value.summary || value.problem, problem)
  const severity = SEVERITIES.has(value.severity) ? value.severity : 'medium'
  const faultCategory = normalizeString(
    value.fault_category || value.faultCategory,
    'General Mechanical'
  )

  return {
    problem,
    summary,
    fault_category: faultCategory,
    severity,
    recommendations: normalizeArray(value.recommendations),
    estimated_causes: normalizeArray(
      value.estimated_causes || value.estimatedCauses
    ),
    provider: value.provider || defaultProvider,
    isFallback: Boolean(value.isFallback),
    fallbackReason: value.fallbackReason || null,
  }
}
