// web/src/lib/ai/providers/GeminiProvider.js
import { GoogleGenAI, Type } from '@google/genai'
import { BaseProvider } from './BaseProvider.js'
import { cleanJsonString, normalizeDiagnosticResult } from '../types.js'

export class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini')
    this.client = null
  }

  isAvailable() {
    return Boolean(process.env.GEMINI_API_KEY?.trim())
  }

  getClient() {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY?.trim()
      if (!apiKey) {
        const err = new Error('Missing GEMINI_API_KEY')
        err.status = 401
        err.fallbackEligible = true
        throw err
      }
      this.client = new GoogleGenAI({ apiKey })
    }
    return this.client
  }

  async diagnose(input, timeoutMs = 7000) {
    return this.executeWithTimeout(async (signal) => {
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      const userContent = this.formatUserPrompt(input)
      const ai = this.getClient()

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: userContent,
        config: {
          systemInstruction: this.getSystemInstruction(),
          maxOutputTokens: 1024,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              problem: {
                type: Type.STRING,
                description: 'A concise description of the primary vehicle problem.',
              },
              summary: {
                type: Type.STRING,
                description: 'Short summary matching the primary problem.',
              },
              fault_category: {
                type: Type.STRING,
                description: 'Category of the mechanical/electrical fault.',
              },
              severity: {
                type: Type.STRING,
                enum: ['low', 'medium', 'high', 'critical'],
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to four safe actions the driver can take.',
              },
              estimated_causes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Top probable mechanical or electrical causes.',
              },
            },
            required: ['problem', 'severity', 'recommendations', 'estimated_causes'],
          },
        },
      })

      const response = await Promise.race([
        generatePromise,
        new Promise((_, reject) => {
          if (signal.aborted) {
            reject(new Error(`Provider [gemini] timed out after ${timeoutMs}ms`))
          }
          signal.addEventListener('abort', () => {
            reject(new Error(`Provider [gemini] timed out after ${timeoutMs}ms`))
          })
        }),
      ])

      const rawText =
        response?.text ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        ''

      if (!rawText) {
        const err = new Error('Empty response from Gemini API')
        err.status = 502
        err.fallbackEligible = true
        throw err
      }

      let parsed
      try {
        parsed = JSON.parse(cleanJsonString(rawText))
      } catch (parseError) {
        const err = new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`)
        err.status = 502
        err.fallbackEligible = true
        throw err
      }

      return normalizeDiagnosticResult(parsed, 'gemini')
    }, timeoutMs)
  }
}
