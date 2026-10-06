// web/src/lib/ai/providers/OpenRouterProvider.js
import { BaseProvider } from './BaseProvider.js'
import { cleanJsonString, normalizeDiagnosticResult } from '../types.js'

export class OpenRouterProvider extends BaseProvider {
  constructor() {
    super('openrouter')
  }

  isAvailable() {
    return Boolean(process.env.OPENROUTER_API_KEY?.trim())
  }

  async diagnose(input, timeoutMs = 7000) {
    return this.executeWithTimeout(async (signal) => {
      const apiKey = process.env.OPENROUTER_API_KEY?.trim()
      if (!apiKey) {
        const err = new Error('Missing OPENROUTER_API_KEY')
        err.status = 401
        err.fallbackEligible = true
        throw err
      }

      const model =
        process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct'
      const userContent = this.formatUserPrompt(input)
      const siteUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://roadrescue.local'

      const payload = {
        model,
        messages: [
          { role: 'system', content: this.getSystemInstruction() },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1024,
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': siteUrl,
          'X-Title': 'RoadRescue Diagnostics',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      })

      if (!res.ok) {
        let errMsg = `OpenRouter API responded with status ${res.status}`
        try {
          const errData = await res.json()
          if (errData?.error?.message) {
            errMsg = `OpenRouter API: ${errData.error.message}`
          }
        } catch {
          // ignore parse errors
        }
        const error = new Error(errMsg)
        error.status = res.status
        error.fallbackEligible = true
        throw error
      }

      const data = await res.json()
      const rawText = data?.choices?.[0]?.message?.content || ''

      if (!rawText) {
        const err = new Error('Empty response from OpenRouter API')
        err.status = 502
        err.fallbackEligible = true
        throw err
      }

      let parsed
      try {
        parsed = JSON.parse(cleanJsonString(rawText))
      } catch (parseError) {
        const err = new Error(
          `Failed to parse OpenRouter response as JSON: ${parseError.message}`
        )
        err.status = 502
        err.fallbackEligible = true
        throw err
      }

      return normalizeDiagnosticResult(parsed, 'openrouter')
    }, timeoutMs)
  }
}
