// web/src/lib/ai/ruleFallback.js
import { normalizeDiagnosticResult } from './types.js'

export function buildFallbackDiagnosis(
  symptoms = '',
  reason = 'Full AI model temporarily unavailable. Showing standard preliminary checks.'
) {
  const text = (symptoms || '').toLowerCase().trim()

  if (/\b(brakes?|braking|grind(?:ing)?|squeal(?:ing|s)?|squeaks?|rotors?|pads?|pedals?)\b/.test(text)) {
    return normalizeDiagnosticResult(
      {
        problem: `Preliminary Check: Brake system wear or hydraulic pressure alert ("${symptoms}").`,
        summary: `Preliminary Check: Brake system wear or hydraulic pressure alert.`,
        fault_category: 'Brakes & Hydraulic',
        severity: 'high',
        recommendations: [
          'Test braking responsiveness at low speeds in a safe area.',
          'Check the brake fluid reservoir under the bonnet for proper level.',
          'Do not drive if the brake pedal feels spongy or sinks to the floor.',
          'Dispatch a RoadRescue technician or tow service for a safety inspection.',
        ],
        estimated_causes: [
          'Worn brake pads or worn brake shoes',
          'Grooved or warped brake rotor/drum',
          'Low brake fluid or air in hydraulic lines',
          'Stuck or leaking brake caliper',
        ],
        isFallback: true,
        fallbackReason: reason,
      },
      'rule-fallback'
    )
  }

  if (/\b(overheat(?:ing)?|smoke|steams?|coolant|radiators?|temp(?:erature)?|hot|boil(?:ing)?|antifreeze)\b/.test(text)) {
    return normalizeDiagnosticResult(
      {
        problem: `Preliminary Check: Engine overheating or thermal management alert ("${symptoms}").`,
        summary: `Preliminary Check: Engine overheating or thermal management alert.`,
        fault_category: 'Cooling System',
        severity: 'critical',
        recommendations: [
          'Pull over safely and turn off the engine immediately.',
          'CAUTION: NEVER open the radiator cap while the engine is hot.',
          'Allow the engine to cool for at least 20-30 minutes before checking fluid levels.',
          'Dispatch roadside assistance to prevent severe engine damage.',
        ],
        estimated_causes: [
          'Low coolant level or radiator hose leak',
          'Failing radiator fan or stuck thermostat',
          'Worn water pump',
          'Blown head gasket',
        ],
        isFallback: true,
        fallbackReason: reason,
      },
      'rule-fallback'
    )
  }

  if (/\b(starts?|starting|cranks?|cranking|clicks?|clicking|batter(?:y|ies)|dead|ignition|alternators?|power)\b/.test(text)) {
    return normalizeDiagnosticResult(
      {
        problem: `Preliminary Check: Electrical power or starter/ignition fault ("${symptoms}").`,
        summary: `Preliminary Check: Electrical power or starter/ignition fault.`,
        fault_category: 'Electrical & Battery',
        severity: 'medium',
        recommendations: [
          'Check if dashboard lights and headlights turn on with normal brightness.',
          'Inspect battery terminals for loose clamps or white corrosion.',
          'Attempt a jump-start using booster cables or a jump starter pack.',
          'If clicking continues despite a full battery, the starter motor may need replacement.',
        ],
        estimated_causes: [
          'Depleted or dead 12V battery',
          'Corroded or loose battery cable terminals',
          'Faulty starter motor or starter solenoid',
          'Failing alternator or charging circuit',
        ],
        isFallback: true,
        fallbackReason: reason,
      },
      'rule-fallback'
    )
  }

  if (/\b(tires?|tyres?|flats?|punctures?|blowouts?|wheels?|wobbles?|wobbling|vibrat(?:e|ing|ion|ions)?|pulling|psi)\b/.test(text)) {
    return normalizeDiagnosticResult(
      {
        problem: `Preliminary Check: Tire pressure, puncture, or wheel balance alert ("${symptoms}").`,
        summary: `Preliminary Check: Tire pressure, puncture, or wheel balance alert.`,
        fault_category: 'Tires & Suspension',
        severity: 'high',
        recommendations: [
          'Safely pull over to a level, solid surface away from moving traffic.',
          'Inspect tires for punctures, embedded nails, or sidewall bulges.',
          'Verify tire pressure against the PSI specification on the driver door jamb.',
          'Fit the spare tire or request RoadRescue roadside tire assistance.',
        ],
        estimated_causes: [
          'Punctured tire or leaking valve stem',
          'Low tire pressure (under-inflation)',
          'Wheel misalignment or unbalanced wheel',
          'Worn wheel bearing or suspension joint',
        ],
        isFallback: true,
        fallbackReason: reason,
      },
      'rule-fallback'
    )
  }

  if (/\b(engines?|check engine|stalls?|stalling|misfir(?:e|es|ing)?|jerks?|jerking|rough|idle|idling|hesitat(?:e|ing|ion)?|sputters?|sputtering|cel)\b/.test(text)) {
    return normalizeDiagnosticResult(
      {
        problem: `Preliminary Check: Powertrain or engine management alert ("${symptoms}").`,
        summary: `Preliminary Check: Powertrain or engine management alert.`,
        fault_category: 'Engine & Powertrain',
        severity: 'medium',
        recommendations: [
          'Check if the Check Engine light is solid or flashing (flashing indicates active misfire).',
          'Inspect the engine oil level with the dipstick when the engine is off and cool.',
          'Avoid heavy acceleration or high-speed driving while the engine runs rough.',
          'Have the vehicle scanned for OBD-II error trouble codes.',
        ],
        estimated_causes: [
          'Worn spark plugs or failing ignition coils',
          'Clogged fuel injector, fuel filter, or weak fuel pump',
          'Dirty Mass Air Flow (MAF) or throttle body sensor',
          'Vacuum leak or intake sensor anomaly',
        ],
        isFallback: true,
        fallbackReason: reason,
      },
      'rule-fallback'
    )
  }

  if (/\b(gears?|transmissions?|clutch(?:es)?|shifts?|shifting|slips?|slipping|reverse|drive)\b/.test(text)) {
    return normalizeDiagnosticResult(
      {
        problem: `Preliminary Check: Transmission or clutch engagement anomaly ("${symptoms}").`,
        summary: `Preliminary Check: Transmission or clutch engagement anomaly.`,
        fault_category: 'Transmission & Drivetrain',
        severity: 'high',
        recommendations: [
          'Check transmission fluid level and condition if accessible.',
          'Avoid forcing gear shift levers if resistance is felt.',
          'Note whether the engine revs up without normal vehicle acceleration.',
          'Dispatch a transmission specialist before driving further distances.',
        ],
        estimated_causes: [
          'Low or degraded transmission fluid',
          'Worn clutch friction plate or pressure plate',
          'Transmission shift solenoid or linkage fault',
          'Torque converter wear',
        ],
        isFallback: true,
        fallbackReason: reason,
      },
      'rule-fallback'
    )
  }

  if (/\b(fuels?|petrol|gas|diesel|smells?|smelling|leaks?|leaking|odors?|fumes?)\b/.test(text)) {
    return normalizeDiagnosticResult(
      {
        problem: `Preliminary Check: Fluid leak or combustible fuel odor warning ("${symptoms}").`,
        summary: `Preliminary Check: Fluid leak or combustible fuel odor warning.`,
        fault_category: 'Fuel System',
        severity: 'critical',
        recommendations: [
          'Park safely, shut off the engine, and exit the vehicle if fuel odor is strong.',
          'Do NOT light matches, smoke, or use open flames near the vehicle.',
          'Look beneath the vehicle for active dripping or puddles.',
          'Request immediate roadside technician inspection.',
        ],
        estimated_causes: [
          'Fuel line leak or loose fuel vapor cap',
          'Oil leaking onto hot exhaust components',
          'Exhaust manifold leak entering the ventilation system',
          'Coolant heater core leak',
        ],
        isFallback: true,
        fallbackReason: reason,
      },
      'rule-fallback'
    )
  }

  return normalizeDiagnosticResult(
    {
      problem: `Preliminary Assessment: "${symptoms || 'vehicle issue'}"`,
      summary: `Preliminary Assessment: "${symptoms || 'vehicle issue'}"`,
      fault_category: 'General Mechanical',
      severity: 'medium',
      recommendations: [
        'Inspect dashboard warning lights for active indicators.',
        'Check engine oil, coolant, and brake fluid levels before moving the vehicle.',
        'Verify battery terminal tightness and clean connections.',
        'Dispatch a RoadRescue mechanic for an in-person diagnostic scan.',
      ],
      estimated_causes: [
        'Ignition system or battery power fault',
        'Fluid level or mechanical pressure loss',
        'Electrical sensor anomaly',
      ],
      isFallback: true,
      fallbackReason: reason,
    },
    'rule-fallback'
  )
}

export function buildBusyDiagnosis(is503 = false) {
  return normalizeDiagnosticResult(
    {
      problem: is503
        ? 'The diagnostic system is experiencing high demand. Please retry shortly.'
        : 'Diagnostic module currently busy',
      summary: is503
        ? 'High demand on diagnostic network'
        : 'Diagnostic module busy',
      fault_category: 'Other',
      severity: 'medium',
      recommendations: is503
        ? [
            'Retry submitting your symptom phrase in a few moments.',
            'Check dashboard cluster warning lights.',
          ]
        : ['Retry the diagnosis in a moment.'],
      estimated_causes: is503 ? ['AI Infrastructure API congestion'] : [],
      isFallback: true,
      fallbackReason: is503
        ? 'AI capacity congested'
        : 'Diagnostic service temporarily busy',
    },
    'rule-fallback'
  )
}
