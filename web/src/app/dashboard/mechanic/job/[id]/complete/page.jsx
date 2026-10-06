'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import Spinner from '@/components/ui/Spinner'

const services = [
  'Tire Change',
  'Jumpstart',
  'Fuel Delivery',
  'Diagnostic Scan',
]

export default function JobCompletionPage() {
  const { id } = useParams()
  const router = useRouter()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [performed, setPerformed] = useState(['Tire Change'])

  useEffect(() => {
    let mounted = true

    async function loadJob() {
      const response = await fetch(`/api/requests/${id}`)
      const payload = await response.json()

      if (mounted) {
        setJob(response.ok ? payload.request : null)
        setLoading(false)
      }
    }

    loadJob()
    return () => { mounted = false }
  }, [id])

  async function submitCompletion() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/requests/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, newStatus: 'completed', completionNotes: notes, performedServices: performed }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to complete job')

      router.push(`/dashboard/mechanic/job/${id}`)
    } catch (error) {
      alert(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function toggleService(service) {
    setPerformed((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service])
  }

  return (
    <PageWrapper title="Job completion report" description="Record the final service details and close the rescue ticket.">
      {loading ? (
        <div className="flex h-[50vh] items-center justify-center"><Spinner /></div>
      ) : !job ? (
        <Card><div className="py-12 text-center text-sm text-muted">Job not found.</div></Card>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#7C7767]">Ticket #{job.id}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">{job.service_type?.replace('_', ' ')}</h2>
            <p className="mt-1 text-sm text-[#7C7767]">{job.incident_address || 'Location pending'}</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#7C7767]">Services performed</p>
            <div className="mt-3 space-y-3">
              {services.map((service) => (
                <button key={service} onClick={() => toggleService(service)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${performed.includes(service) ? 'border-primary bg-primary/10' : 'border-[#7C7767]/25 bg-[#F3F4F6]'}`}>
                  <span className="text-sm font-semibold text-[#111827]">{service}</span>
                  <span className={`h-4 w-4 rounded border ${performed.includes(service) ? 'border-primary bg-primary' : 'border-[#7C7767]/25 bg-[#F3F4F6]'}`} />
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <Textarea label="Service notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe work done, parts used, or follow-up recommendations..." />
            <Button fullWidth className="mt-5" loading={submitting} onClick={submitCompletion}>
              Submit report
            </Button>
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}