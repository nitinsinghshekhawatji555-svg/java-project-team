'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageWrapper from '@/components/layout/PageWrapper'
import toast from 'react-hot-toast'
import Spinner from '@/components/ui/Spinner'
import ReportModal from '@/components/report/ReportModal'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
import { useBroadcastLocation } from '@/hooks/useMechanicLocation'
import {
  Wrench,
  Car,
  User,
  MapPin,
  Phone,
  AlertTriangle,
  ShieldAlert,
  Cpu,
  Calendar,
  CheckCircle2,
  Clock,
  Navigation,
  Zap,
  ChevronRight,
  Flag,
  MessageSquare,
} from 'lucide-react'
import RescueChatModal from '@/components/request/RescueChatModal'

const RescueMap = dynamic(() => import('@/components/map/RescueMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl">
      <Spinner />
    </div>
  ),
})

/* ─── Status config ─────────────────────────────────────────────────────── */
const STATUSES = [
  { key: 'pending',     label: 'Requested',  icon: Clock },
  { key: 'accepted',   label: 'Accepted',   icon: CheckCircle2 },
  { key: 'en_route',   label: 'En route',   icon: Navigation },
  { key: 'arrived',    label: 'On site',    icon: MapPin },
  { key: 'in_progress',label: 'Working',    icon: Wrench },
  { key: 'completed',  label: 'Completed',  icon: Flag },
]

const STATUS_ORDER = STATUSES.map((s) => s.key)

const STATUS_BADGE = {
  pending:     'bg-amber-50  text-amber-700  ring-amber-200',
  accepted:    'bg-blue-50   text-blue-700   ring-blue-200',
  en_route:    'bg-indigo-50 text-indigo-700 ring-indigo-200',
  arrived:     'bg-violet-50 text-violet-700 ring-violet-200',
  in_progress: 'bg-orange-50 text-orange-700 ring-orange-200',
  completed:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled:   'bg-red-50    text-red-700    ring-red-200',
}

/* ─── StatusTimeline ────────────────────────────────────────────────────── */
function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div className="flex items-start gap-0 w-full overflow-x-auto pb-1 no-scrollbar">
      {STATUSES.map(({ key, label, icon: Icon }, idx) => {
        const done    = idx < currentIdx
        const active  = idx === currentIdx
        const pending = idx > currentIdx

        return (
          <div key={key} className="flex items-center flex-1 min-w-0">
            {/* Step */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={[
                  'flex items-center justify-center w-9 h-9 rounded-full ring-2 transition-all duration-300',
                  done    ? 'bg-emerald-500 ring-emerald-500 text-white'             : '',
                  active  ? 'bg-white ring-blue-500 text-blue-600 shadow-md shadow-blue-100' : '',
                  pending ? 'bg-slate-100 ring-slate-200 text-slate-400'             : '',
                ].join(' ')}
              >
                {done ? (
                  <CheckCircle2 size={16} className="fill-white stroke-emerald-500" />
                ) : (
                  <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                )}
              </div>
              <span
                className={[
                  'mt-1.5 text-[10px] font-semibold whitespace-nowrap leading-tight text-center',
                  done    ? 'text-emerald-600' : '',
                  active  ? 'text-blue-600'    : '',
                  pending ? 'text-slate-400'   : '',
                ].join(' ')}
              >
                {label}
                {active}
              </span>
            </div>

            {/* Connector */}
            {idx < STATUSES.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 mt-[-18px] rounded-full transition-all duration-500"
                style={{
                  background: done
                    ? '#10b981'
                    : active
                    ? 'linear-gradient(to right, #3b82f6, #e2e8f0)'
                    : '#e2e8f0',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── SectionCard ───────────────────────────────────────────────────────── */
function SectionCard({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#DCCDA9]/70 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-[#FAF6EC]/50">
        <Icon size={14} className="text-[#8A7A50] flex-shrink-0" />
        <span className="text-[10px] font-black text-[#8A7A50] uppercase tracking-widest">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ─── ActionButton ──────────────────────────────────────────────────────── */
function ActionButton({ onClick, disabled, children, variant = 'primary', className = '' }) {
  const base = 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs'
  const variants = {
    primary:  'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
    success:  'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    warning:  'bg-primary hover:brightness-105 text-slate-950 shadow-xs',
    blue:     'bg-blue-600 hover:bg-blue-700 text-white shadow-xs',
    danger:   'bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300',
    ghost:    'bg-[#FAF6EC] hover:bg-white text-slate-700 border border-slate-200',
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
const CANCEL_REASON_OPTIONS = [
  { value: 'requires_towing', label: 'Vehicle requires towing / heavy equipment I do not have' },
  { value: 'parts_unavailable', label: 'Required parts/tools are unavailable' },
  { value: 'driver_unresponsive', label: 'Driver is unresponsive / failed to show up' },
  { value: 'safety_hazard', label: 'Safety / environmental hazard' },
  { value: 'other', label: 'Other (specify below)' },
]

export default function MechanicJobDetailsPage() {
  const params = useParams()
  const jobId = params.id
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReasonCategory, setCancelReasonCategory] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const supabase = createClient()
  const { user } = useAuth()
  const [localCoords, setLocalCoords] = useState(null)
  const [mechanicProfile, setMechanicProfile] = useState(null)
  const [graceTimeLeft, setGraceTimeLeft] = useState(null)

  /* ── Shared update helper ─────────────────────────────────── */
  const updateStatus = async (newStatus, extra = {}) => {
    if (!user?.id) { alert('Session expired — please log in again.'); return }
    setUpdating(true)
    try {
      const res = await fetch('/api/requests/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: jobId, mechanicId: user.id, newStatus, ...extra }),
      })
      const result = await res.json()
      if (res.ok && result.request) {
        setJob(result.request)
      } else if (res.status === 409) {
        // Explicit 409 Conflict handling for race conditions / double-claim attempts
        alert(' Job Unavailable: ' + (result.error || 'This rescue request was already claimed by another mechanic or its status was changed.'))
        // Re-fetch current state to update the UI
        const refreshRes = await fetch(`/api/requests/${jobId}`)
        const refreshData = await refreshRes.json()
        if (refreshRes.ok && refreshData.request) {
          setJob(refreshData.request)
        }
      } else {
        alert(result.error || 'Could not update status.')
      }
    } catch { alert('Network error — please try again.') }
    finally { setUpdating(false) }
  }

  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()

    async function loadProfile() {
      const { data } = await supabase
        .from('mechanic_profiles')
        .select('is_available, current_status')
        .eq('user_id', user.id)
        .maybeSingle()
      setMechanicProfile(data)
    }
    loadProfile()

    const channel = supabase
      .channel(`my-profile-status-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mechanic_profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setMechanicProfile(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, jobId])

  useEffect(() => {
    const isActive = ['accepted', 'en_route', 'arrived', 'in_progress'].includes(job?.status)
    const isOffline = mechanicProfile && mechanicProfile.is_available === false && mechanicProfile.current_status

    if (!isActive || !isOffline) {
      setGraceTimeLeft(null)
      return
    }

    const interval = setInterval(() => {
      const offlineTime = new Date(mechanicProfile.current_status).getTime()
      const diffMs = (offlineTime + 600000) - Date.now()
      if (diffMs <= 0) {
        setGraceTimeLeft(0)
        clearInterval(interval)
        
        const cancelDueToOffline = async () => {
          try {
            await updateStatus('cancelled', { cancellationReason: "couldn't resolve" })
            toast.error("Dispatch automatically cancelled because you remained offline.")
          } catch (e) {
            console.error(e)
          }
        }
        cancelDueToOffline()
      } else {
        setGraceTimeLeft(Math.max(0, Math.floor(diffMs / 1000)))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [job?.status, mechanicProfile?.is_available, mechanicProfile?.current_status, jobId])

  const isActive =
    job &&
    job.mechanic_id === user?.id &&
    ['accepted', 'en_route', 'arrived', 'in_progress'].includes(job.status)

  useBroadcastLocation(isActive ? jobId : null, user?.id)

  useEffect(() => {
    if (!isActive) {
      setTimeout(() => {
        setLocalCoords(null)
      }, 0)
      return
    }
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocalCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('[GPS]:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [isActive])

  useEffect(() => {
    if (!jobId) return

    async function loadJob() {
      const res = await fetch(`/api/requests/${jobId}`)
      const { request } = await res.json()
      if (res.ok) setJob(request)
      setLoading(false)
    }

    loadJob()

    const channel = supabase
      .channel(`request-status-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rescue_requests', filter: `id=eq.${jobId}` },
        () => {
          loadJob()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId, supabase])

  const cancelJob = () => {
    setShowCancelModal(true)
  }

  const confirmCancelJob = async () => {
    const finalReason = cancelReason.trim() || 'Mechanic cancelled job'
    await updateStatus('cancelled', { cancellationReason: finalReason })
    setShowCancelModal(false)
  }

  /* ── Loading / not found states ───────────────────────────── */
  if (loading) return (
    <PageWrapper title="Job details">
      <div className="flex h-[50vh] items-center justify-center"><Spinner /></div>
    </PageWrapper>
  )

  if (!job) return (
    <PageWrapper title="Job details">
      <div className="max-w-xl mx-auto mt-12 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Job not found</h3>
        <p className="text-sm text-slate-400 mt-1">This request couldn&apos;t be loaded or may have been removed.</p>
      </div>
    </PageWrapper>
  )

  const badgeClass = STATUS_BADGE[job.status] || STATUS_BADGE.pending
  const driverLat  = job?.incident_lat ? parseFloat(job.incident_lat) : job?.incident_location?.coordinates?.[1]
  const driverLng  = job?.incident_lng ? parseFloat(job.incident_lng) : job?.incident_location?.coordinates?.[0]
  const mapValid   = !isNaN(parseFloat(driverLat)) && !isNaN(parseFloat(driverLng))

  /* ── Next action config ───────────────────────────────────── */
  const nextActions = {
    pending:     { label: 'Accept job',         variant: 'warning', icon: Zap,        fn: () => updateStatus('accepted') },
    accepted:    { label: 'Start driving',      variant: 'blue',    icon: Navigation, fn: () => updateStatus('en_route') },
    en_route:    { label: 'Mark as arrived',    variant: 'primary', icon: MapPin,     fn: () => updateStatus('arrived') },
    arrived:     { label: 'Begin service',      variant: 'primary', icon: Wrench,     fn: () => updateStatus('in_progress') },
    in_progress: { label: 'Complete job',       variant: 'success', icon: Flag,       fn: () => updateStatus('completed') },
  }
  const next = nextActions[job.status]

  return (
    <PageWrapper
      title={`Job #${jobId.slice(0, 8).toUpperCase()}`}
      description="Keep the driver updated as you move through each stage."
    >
      {graceTimeLeft !== null && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 animate-pulse flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-700 shrink-0" />
          <span>You are offline. Return online within {Math.floor(graceTimeLeft / 60)}m {graceTimeLeft % 60}s to prevent automatic dispatch cancellation.</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Accept banner — only when truly unassigned */}
          {job.status === 'pending' && !job.mechanic_id && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Zap size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">New job available</p>
                    <p className="text-xs text-amber-600 mt-0.5">Accept to claim this rescue request</p>
                  </div>
                </div>
                <button
                  onClick={() => updateStatus('accepted')}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {updating ? 'Accepting…' : 'Accept job'}
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Status timeline ── */}
          <SectionCard icon={Clock} title="Job progress">
            {/* Badge */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs text-slate-400">Current stage</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${badgeClass}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                {job.status?.replace('_', ' ')}
              </span>
            </div>
            <StatusTimeline currentStatus={job.status} />
          </SectionCard>

          {/* ── Problem details ── */}
          <SectionCard icon={Wrench} title="Problem details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Issue type</span>
                <p className="text-sm font-semibold text-slate-900 capitalize">{job.service_type?.replace('_', ' ') || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Requested at</span>
                <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-400" />
                  {job.created_at
                    ? new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Driver&apos;s notes</span>
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 p-3.5 rounded-xl italic leading-relaxed">
                &ldquo;{job.problem_description || 'No additional details provided.'}&rdquo;
              </p>
            </div>

            {/* AI diagnostic */}
            {job.ai_diagnostic_result && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-blue-500 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">AI Diagnostic</span>
                  </div>
                  {job.ai_diagnostic_result.severity && (
                    <Badge
                      label={job.ai_diagnostic_result.severity}
                      variant={job.ai_diagnostic_result.severity}
                      dot
                      className="text-[10px] font-bold"
                    />
                  )}
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {job.ai_diagnostic_result.problem || job.ai_diagnostic_result.summary}
                </p>
                {job.ai_diagnostic_result.recommendations?.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-blue-100 pt-3">
                    {job.ai_diagnostic_result.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Vehicle ── */}
          <SectionCard icon={Car} title="Vehicle">
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm flex-shrink-0">
                <Car size={20} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {job.vehicle_make ? (
                    `${job.vehicle_year || ''} ${job.vehicle_make} ${job.vehicle_model || ''}`.trim()
                  ) : (
                    <span className="text-slate-400 italic text-xs font-medium">No vehicle details registered</span>
                  )}
                </p>
                {job.vehicle_make && (
                  <p className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md mt-1.5 inline-block uppercase tracking-wider">
                    {job.vehicle_plate || 'No plate'}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Driver card */}
          <SectionCard icon={User} title="Driver">
            <div className="flex items-center gap-3 mb-4">
              {job.driver?.avatar_url ? (
                <Image
                  src={job.driver.avatar_url} alt="" width={44} height={44}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200 flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-bold text-slate-600 text-sm flex-shrink-0">
                  {job.driver?.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{job.driver?.full_name || 'Unknown driver'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{job.driver?.phone || 'No phone'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <ActionButton
                variant="warning"
                onClick={() => setIsChatOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-xs cursor-pointer"
              >
                <MessageSquare size={14} />
                Chat with driver
              </ActionButton>
              {job.driver?.phone && (
                <a href={`tel:${job.driver.phone}`} className="block">
                  <ActionButton variant="primary">
                    <Phone size={14} />
                    Call driver
                  </ActionButton>
                </a>
              )}
              <ActionButton variant="danger" onClick={() => setIsReportModalOpen(true)}>
                <ShieldAlert size={14} />
                Report an issue
              </ActionButton>
            </div>
          </SectionCard>

          {/* Location */}
          <SectionCard icon={MapPin} title="Location">
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">{job.incident_address}</p>
            <div className="overflow-hidden rounded-xl h-[220px] relative z-10">
              {mapValid ? (
                <RescueMap
                  request={job}
                  mechanicLocation={localCoords}
                  userRole="mechanic"
                  isOnline={true}
                  height="100%"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                  <div className="text-center">
                    <MapPin size={20} className="mx-auto mb-1 opacity-40" />
                    <p className="text-xs">Location unavailable</p>
                  </div>
                </div>
              )}
            </div>
            {localCoords && (
              <p className="text-[10px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Broadcasting your location
              </p>
            )}
          </SectionCard>

          {/* ── Actions panel ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
              <Zap size={15} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Actions</span>
            </div>

            <div className="p-5 space-y-2.5">
              {next && !['completed', 'cancelled'].includes(job.status) && (
                <ActionButton
                  variant={next.variant}
                  onClick={next.fn}
                  disabled={updating}
                >
                  <next.icon size={15} />
                  {updating ? 'Updating…' : next.label}
                </ActionButton>
              )}

              {job.status === 'completed' && (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Flag size={20} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Job complete</p>
                  <p className="text-xs text-slate-400">This request has been resolved.</p>
                </div>
              )}

              {job.status === 'cancelled' && (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Job cancelled</p>
                  <p className="text-xs text-slate-400">This request was cancelled.</p>
                </div>
              )}

              {['pending', 'accepted', 'en_route', 'arrived'].includes(job.status) && (
                <>
                  {next && <div className="h-px bg-slate-100" />}
                  <ActionButton variant="danger" onClick={cancelJob} disabled={updating}>
                    Cancel job
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        requestId={jobId}
        reporterId={user?.id}
      />

      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setCancelReasonCategory('')
          setCancelReason('')
        }}
        title="Cancel Job Assignment?"
        size="sm"
        actions={
          <>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCancelModal(false)
                setCancelReasonCategory('')
                setCancelReason('')
              }}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Keep Job
            </Button>
            <Button 
              variant="danger"
              size="sm"
              onClick={confirmCancelJob}
              disabled={updating || !cancelReasonCategory}
              loading={updating}
              className="text-xs font-bold uppercase tracking-wider px-4"
            >
              Confirm Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-[#FFF9EF] border border-[#E8DCC0] p-3 text-xs text-[#6C5E3B] font-medium leading-relaxed">
            Please select a reason for cancellation. This will release the job back to available nearby units.
          </div>

          <Select
            label="Cancellation Reason"
            id="cancel-reason-category"
            value={cancelReasonCategory}
            onChange={(e) => {
              const val = e.target.value
              setCancelReasonCategory(val)
              if (val !== 'other') {
                const opt = CANCEL_REASON_OPTIONS.find(o => o.value === val)
                setCancelReason(opt ? opt.label : '')
              } else {
                setCancelReason('')
              }
            }}
            options={[{ value: '', label: 'Select a cancellation reason...' }, ...CANCEL_REASON_OPTIONS]}
          />
          
          {(cancelReasonCategory === 'other' || cancelReasonCategory === '') && (
            <Textarea
              label="Custom Reason / Explanation"
              id="cancel-reason"
              rows={3}
              placeholder="Please describe why you are cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="p-3 text-xs bg-[#FFFBF7] text-[#1F1B10] border-[#DDD0A8]"
            />
          )}
        </div>
      </Modal>

      {/* LIVE CHAT MODAL */}
      <RescueChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        requestId={jobId}
        contactName={job.driver?.full_name || 'Driver'}
        contactRole="Driver"
        statusText={`Job #${jobId.slice(0, 8).toUpperCase()} · ${job.status?.replace('_', ' ')}`}
        initialStatus={job.status}
      />
    </PageWrapper>
  )
}