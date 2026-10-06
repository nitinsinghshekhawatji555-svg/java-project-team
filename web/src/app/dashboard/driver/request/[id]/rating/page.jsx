'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import Spinner from '@/components/ui/Spinner'
import Avatar from '@/components/ui/Avatar'
import { Star } from 'lucide-react'

export default function DriverRatingPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadRequest() {
      const { data } = await supabase
        .from('rescue_requests')
        .select('id, status, service_type, problem_description, incident_address, mechanic:mechanic_id (id, full_name, avatar_url, mechanic_profiles (business_name))')
        .eq('id', id)
        .single()

      if (mounted) {
        setRequest(data || null)
        setLoading(false)
      }
    }

    loadRequest()
    return () => {
      mounted = false
    }
  }, [id, supabase])

  async function submit() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/requests/rate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, rating, review }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save rating')

      router.push('/dashboard/driver')
    } catch (error) {
      alert(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper title="Rescue successful" description="Rate your mechanic and share a short note about the service.">
      {loading ? (
        <div className="flex h-[50vh] items-center justify-center"><Spinner /></div>
      ) : !request ? (
        <Card><div className="py-12 text-center text-sm text-muted">Request not found.</div></Card>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="overflow-hidden p-0">
            <div className="bg-primary px-4 py-4 text-[#111827]">
              <p className="text-xs font-black uppercase tracking-[0.22em]">Service summary</p>
              <h2 className="mt-1 text-2xl font-black">{request.service_type?.replace('_', ' ')}</h2>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={request.mechanic?.full_name || 'Mechanic'} src={request.mechanic?.avatar_url} size="lg" />
                <div>
                  <p className="text-lg font-semibold text-[#111827]">{request.mechanic?.full_name || 'Mechanic'}</p>
                  <p className="text-sm text-[#7C7767]">{request.mechanic?.mechanic_profiles?.business_name || 'RoadRescue Verified Mechanic'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#7C7767]">Rate Experience</p>
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={32}
                    className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-[#7C7767]/30'}
                  />
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              <Textarea label="Additional Feedback" value={review} onChange={(event) => setReview(event.target.value)} placeholder="Tell us about your experience..." />
            </div>

            <Button fullWidth className="mt-6" loading={submitting} onClick={submit}>
              Done
            </Button>
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}