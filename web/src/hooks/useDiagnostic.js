import { useState } from 'react'

export function useDiagnostic() {
  const [diagnosis, setDiagnosis] = useState(null)
  const [diagnosing, setDiagnosing] = useState(false)
  const [error, setError] = useState(null)

  async function diagnose({ symptoms, vehicleMake, vehicleModel, vehicleYear }) {
    const trimmed = typeof symptoms === 'string' ? symptoms.trim() : ''
    if (!trimmed) {
      setError('Please describe your problem')
      return null
    }

    setDiagnosing(true)
    setError(null)
    setDiagnosis(null)

    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: trimmed,
          vehicleMake,
          vehicleModel,
          vehicleYear,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Diagnostic failed')
      }

      setDiagnosis(data.diagnosis)

      return data.diagnosis

    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setDiagnosing(false)
    }
  }

  function resetDiagnosis() {
    setDiagnosis(null)
    setError(null)
  }

  return {
    diagnosis,
    diagnosing,
    error,
    diagnose,
    resetDiagnosis,
  }
}