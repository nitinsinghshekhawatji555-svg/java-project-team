'use client'

import { useState, useEffect } from 'react'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { timeAgo } from '@/lib/utils'
import { CheckCircle2, Star, Calendar, MessageSquare, HardHat } from 'lucide-react'

export default function MechanicHistoryPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let mounted = true
    
    async function loadHistory() {
      const supabase = createClient()
      if (mounted) setLoading(true)
      
      const { data, error } = await supabase
        .from('rescue_requests')
        .select(`
          id,
          status,
          service_type,
          problem_description,
          completed_at,
          created_at,
          driver:driver_id (id, full_name),
          request_reviews(
            rating,
            review
          )
        `)
        .eq('mechanic_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (!error && mounted) {
        const mappedJobs = (data || []).map(j => ({
          ...j,
          driver_rating: j.request_reviews?.[0]?.rating || j.request_reviews?.rating || null,
          driver_review: j.request_reviews?.[0]?.review || j.request_reviews?.review || null
        }))
        setJobs(mappedJobs)
      }
      if (mounted) setLoading(false)
    }

    loadHistory()
    return () => {
      mounted = false
    }
  }, [user?.id])

  // Compute stats safely
  const ratedJobs = jobs.filter(j => typeof j.driver_rating === 'number' && j.driver_rating > 0)
  const avgRating = ratedJobs.length > 0
    ? (ratedJobs.reduce((sum, j) => sum + j.driver_rating, 0) / ratedJobs.length).toFixed(1)
    : '0.0'

  const currentMonthJobs = jobs.filter((j) => {
    if (!j.completed_at) return false
    const compDate = new Date(j.completed_at)
    const now = new Date()
    return compDate.getMonth() === now.getMonth() && compDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <PageWrapper 
      title="Performance Log" 
      description="Review archived rescue dispatch completions, client rating metrics, and historical feed reviews."
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
        
        {/* ================= METRICS STATS SUMMARY HEADER ================= */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50]">Total Rescues</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <p className="mt-1.5 text-3xl font-black text-[#1E1B15] tracking-tight">{jobs.length}</p>
            <p className="mt-1 text-xs text-slate-500 font-medium">Lifetime closed service calls</p>
          </Card>

          <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50]">Average Rating</span>
              <Star size={16} className="text-amber-500 fill-amber-500" />
            </div>
            <p className="mt-1.5 text-2xl font-black text-[#1E1B15] tracking-tight flex items-center gap-1.5">
              <Star size={18} className="text-amber-500 fill-amber-500" />
              <span>{avgRating} ({ratedJobs.length} reviews)</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 font-medium">Driver satisfaction score</p>
          </Card>

          <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50]">Monthly Volume</span>
              <Calendar size={16} className="text-slate-400" />
            </div>
            <p className="mt-1.5 text-3xl font-black text-[#1E1B15] tracking-tight">{currentMonthJobs}</p>
            <p className="mt-1 text-xs text-slate-500 font-medium">Resolved within current cycle</p>
          </Card>
        </div>

        {/* ================= MAIN HISTORICAL FEED AREA ================= */}
        <div className="w-full">
          {loading ? (
            <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white py-16 flex justify-center shadow-sm">
              <Spinner />
            </Card>
          ) : jobs.length === 0 ? (
            /* Premium design placeholder empty-state setup */
            <div className="rounded-2xl border border-dashed border-[#DCCDA9] bg-white/70 py-16 px-4 text-center max-w-xl mx-auto mt-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF6EC] text-slate-500 mb-3.5 border border-[#E8DFC6] shadow-2xs">
                <HardHat size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Historical Records Found</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 font-medium leading-relaxed">
                When you toggle online and complete incoming breakdown requests, your full dispatch logs will display here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7A50] mb-1">Archived Dispatch History ({jobs.length})</h3>
              {jobs.map((job) => (
                <Card key={job.id} className="rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm hover:border-[#CDBD97] hover:shadow-md transition-all">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge label={job.service_type} variant="completed" dot />
                        <span className="text-[11px] font-medium text-slate-400">{timeAgo(job.completed_at)}</span>
                      </div>
                      
                      <div>
                        <h4 className="text-base font-bold text-slate-900 tracking-tight">
                          {job.driver?.full_name || 'Anonymous Client'}
                        </h4>
                        <p className="mt-1 text-xs font-medium text-slate-600 bg-[#FAF6EC]/60 border border-slate-100 rounded-xl p-3 flex items-start gap-2 max-w-3xl">
                          <MessageSquare size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="italic">
                            {job.driver_review ? `"${job.driver_review}"` : 'No text feedback logged for this session.'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Clean structural rating alignment badge */}
                    <div className="shrink-0 self-start sm:self-auto bg-[#FAF6EC] border border-[#E8DFC6] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                      <Star size={13} className={job.driver_rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
                      <span className="text-xs font-bold text-slate-800">
                        {job.driver_rating ? `${job.driver_rating}.0` : 'Unrated'}
                      </span>
                    </div>

                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageWrapper>
  )
}