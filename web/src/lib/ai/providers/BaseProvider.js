// web/src/lib/ai/providers/BaseProvider.js
import { DIAGNOSTIC_SYSTEM_INSTRUCTION } from '../types.js'

export class BaseProvider {
  constructor(name) {
    this.name = name
  }

  /**
   * Check if provider has the required credentials in environment
   * @returns {boolean}
   */
  isAvailable() {
    return false
  }

  /**
   * Formats the user symptoms and optional vehicle metadata into a standard prompt string
   */
  formatUserPrompt({ symptoms, vehicleMake, vehicleModel, vehicleYear }) {
    return [
      `Symptoms: ${symptoms}`,
      vehicleMake ? `Vehicle Make: ${vehicleMake}` : '',
      vehicleModel ? `Vehicle Model: ${vehicleModel}` : '',
      vehicleYear ? `Vehicle Year: ${vehicleYear}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  /**
   * Returns the system instruction
   */
  getSystemInstruction() {
    return DIAGNOSTIC_SYSTEM_INSTRUCTION
  }

  /**
   * Determines whether an error from this provider warrants fallback to the next provider.
   */
  isFallbackEligibleError(error) {
    if (!error) return false

    if (error.fallbackEligible !== undefined) {
      return Boolean(error.fallbackEligible)
    }

    const status = error.status || error.statusCode || error.response?.status
    if (status) {
      const eligibleStatuses = [401, 403, 408, 429, 500, 502, 503, 504]
      if (eligibleStatuses.includes(status)) return true
    }

    const msg = (error.message || '').toLowerCase()
    const fallbackKeywords = [
      'rate limit',
      'quota',
      'resource_exhausted',
      'overloaded',
      'high demand',
      'timeout',
      'timed out',
      'abort',
      'aborted',
      'econnreset',
      'etimedout',
      'fetch failed',
      'network error',
      '503',
      '500',
      '502',
      '504',
      '429',
      'unauthorized',
      'forbidden',
      'invalid_api_key',
      'api key',
    ]

    return fallbackKeywords.some((keyword) => msg.includes(keyword))
  }

  /**
   * Executes an async operation with an AbortController timeout using Promise.race
   */
  async executeWithTimeout(operation, timeoutMs = 7000) {
    const controller = new AbortController()
    let timer

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        const timeoutError = new Error(
          `Provider [${this.name}] timed out after ${timeoutMs}ms`
        )
        timeoutError.status = 408
        timeoutError.fallbackEligible = true
        reject(timeoutError)
      }, timeoutMs)
    })

    try {
      return await Promise.race([operation(controller.signal), timeoutPromise])
    } finally {
      clearTimeout(timer)
    }
  }

  async diagnose(input, timeoutMs) {
    throw new Error(`Provider [${this.name}] diagnose() method not implemented`)
  }
}
