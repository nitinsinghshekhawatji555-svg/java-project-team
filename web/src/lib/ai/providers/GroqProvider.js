// web/src/lib/ai/providers/GroqProvider.js
import { BaseProvider } from './BaseProvider.js'
import { cleanJsonString, normalizeDiagnosticResult } from '../types.js'

export class GroqProvider extends BaseProvider {
  constructor() {
    super('groq')
  }

  isAvailable() {
    return Boolean(process.env.GROQ_API_KEY?.trim())
  }

  async diagnose(input, timeoutMs = 7000) {
    return this.executeWithTimeout(async (signal) => {
      const apiKey = process.env.GROQ_API_KEY?.trim()
      if (!apiKey) {
        const err = new Error('Missing GROQ_API_KEY')
        err.status = 401
        err.fallbackEligible = true
        throw err
      }

      const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
      const userContent = this.formatUserPrompt(input)

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

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      })

      if (!res.ok) {
        let errMsg = `Groq API responded with status ${res.status}`
        try {
          const errData = await res.json()
          if (errData?.error?.message) {
            errMsg = `Groq API: ${errData.error.message}`
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
        const err = new Error('Empty response from Groq API')
        err.status = 502
        err.fallbackEligible = true
        throw err
      }

      let parsed
      try {
        parsed = JSON.parse(cleanJsonString(rawText))
      } catch (parseError) {
        const err = new Error(`Failed to parse Groq response as JSON: ${parseError.message}`)
        err.status = 502
        err.fallbackEligible = true
        throw err
      }

      return normalizeDiagnosticResult(parsed, 'groq')
    }, timeoutMs)
  }
}
