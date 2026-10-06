// web/src/lib/ai/AiProviderManager.js
import { GeminiProvider } from './providers/GeminiProvider.js'
import { GroqProvider } from './providers/GroqProvider.js'
import { OpenRouterProvider } from './providers/OpenRouterProvider.js'
import { buildFallbackDiagnosis } from './ruleFallback.js'

export class AiProviderManager {
  constructor(options = {}) {
    this.providers = options.providers || [
      new GeminiProvider(),
      new GroqProvider(),
      new OpenRouterProvider(),
    ]
    this.defaultTimeoutMs = options.defaultTimeoutMs || 7000
  }

  getTimeoutMs() {
    const envTimeout = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS, 10)
    return Number.isFinite(envTimeout) && envTimeout > 0
      ? envTimeout
      : this.defaultTimeoutMs
  }

  /**
   * Runs diagnosis sequentially across available providers with automated fallback.
   * @param {Object} input - { symptoms, vehicleMake, vehicleModel, vehicleYear }
   * @returns {Promise<NormalizedDiagnosticResult>}
   */
  async diagnose(input) {
    const timeoutMs = this.getTimeoutMs()
    const { symptoms = '' } = input || {}
    const errors = []

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AI DIAGNOSE] Attempting primary/fallback with [${provider.name}] (timeout: ${timeoutMs}ms)`)
        }
        const result = await provider.diagnose(input, timeoutMs)

        if (result && result.problem) {
          result.isFallback = false
          result.fallbackReason = null
          if (process.env.NODE_ENV === 'development') {
            console.log(`[AI DIAGNOSE SUCCESS] Resolved successfully via provider [${provider.name}]`)
          }
          return result
        }
      } catch (error) {
        // Safe logging without leaking any sensitive data
        const safeErrorMsg = error?.message || 'Unknown provider failure'
        const status = error?.status || error?.statusCode || 'N/A'
        console.warn(
          `[AI PROVIDER FAILED] Provider [${provider.name}] failed (status: ${status}, reason: ${safeErrorMsg}). Checking fallback...`
        )

        errors.push({ provider: provider.name, status, message: safeErrorMsg })

        // Check if error is eligible for fallback
        if (!provider.isFallbackEligibleError(error)) {
          console.warn(`[AI PROVIDER ERROR] Non-fallback-eligible error encountered on [${provider.name}]: ${safeErrorMsg}`)
        }
      }
    }

    // If all providers failed or no provider keys were configured
    const failureSummary =
      errors.length > 0
        ? `AI providers (${errors.map((e) => e.provider).join(', ')}) temporarily unavailable.`
        : 'No AI provider API keys configured.'

    console.warn(`[AI DIAGNOSE FALLBACK] Engaging rule-based offline engine. Reason: ${failureSummary}`)
    return buildFallbackDiagnosis(symptoms, failureSummary)
  }
}

export const aiProviderManager = new AiProviderManager()
