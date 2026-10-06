'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock3, MapPin, PhoneCall, BusFront, ExternalLink, Shield, Compass, 
  CheckCircle2, Radio, AlertTriangle, XCircle, Zap, Wrench, Star, X, 
  ChevronUp, ChevronDown, Sparkles, MessageSquare
} from 'lucide-react'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import DiagnosticResult from '@/components/ai/DiagnosticResult'
import Modal from '@/components/ui/Modal'
import RescueChatModal from '@/components/request/RescueChatModal'
import { useRequestStatus } from '@/hooks/useRequestStatus'
import { useWatchMechanicLocation } from '@/hooks/useMechanicLocation'
import { useAuth } from '@/hooks/useAuth'
import ReportModal from '@/components/report/ReportModal'
import { timeAgo, normalizeGeoPoint, formatDistance } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Select from '@/components/ui/Select'

const RescueMap = dynamic(() => import('@/components/map/RescueMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <Spinner />
    </div>
  ),
})

const ACTIVE_DRIVER_REQUEST_STATUSES = ['accepted', 'en_route', 'arrived', 'in_progress']
const CANCELLATION_ALLOWED_STATUSES = ['pending', 'offered', 'accepted', 'en_route']

// Internal mathematical helper to calculate true physical distance over earth curvature
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Returns distance in km
}

const CANCEL_REASON_OPTIONS = [
  { value: 'resolved_on_own', label: 'Vehicle started working / Problem resolved' },
  { value: 'alternative_help', label: 'Alternative help arrived / Found another mechanic' },
  { value: 'taking_too_long', label: 'Mechanic is taking too long / Delayed response' },
  { value: 'incorrect_details', label: 'Incorrect location or vehicle details entered' },
  { value: 'other', label: 'Other (specify below)' },
]

export default function DriverRequestTrackingPage() {
  const { id } = useParams()
  const router = useRouter()
  const { request, loading } = useRequestStatus(id)
  const { mechanicLocation } = useWatchMechanicLocation(id, request?.status)
  const { user } = useAuth()
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelReasonCategory, setCancelReasonCategory] = useState('')
  const [sheetSnap, setSheetSnap] = useState('half') // 'peek' | 'half' | 'full'
  const [showAlternativeTransit, setShowAlternativeTransit] = useState(false)

  const mechanic = request?.mechanic
  const profileData = mechanic?.mechanic_profiles?.[0] || mechanic?.mechanic_profiles
  const serviceMode = profileData?.service_mode || 'mobile'

  const [graceTimeLeft, setGraceTimeLeft] = useState(null)

  useEffect(() => {
    const isActive = ['accepted', 'en_route', 'arrived', 'in_progress'].includes(request?.status)
    const isOffline = profileData && profileData.is_available === false && profileData.current_status

    if (!isActive || !isOffline) {
      setGraceTimeLeft(null)
      return
    }

    const interval = setInterval(() => {
      const offlineTime = new Date(profileData.current_status).getTime()
      const diffMs = (offlineTime + 600000) - Date.now()
      if (diffMs <= 0) {
        setGraceTimeLeft(0)
        clearInterval(interval)
        
        const cancelDueToOffline = async () => {
          try {
            await fetch('/api/requests/auto-cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestId: id,
                reason: "mechanic went offline / inactivity timeout"
              })
            })
            toast.error("Dispatch automatically cancelled due to mechanic's inactivity.")
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
  }, [request?.status, profileData?.is_available, profileData?.current_status, id])

  const [hasRated, setHasRated] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    async function checkReview() {
      const { data } = await supabase
        .from('request_reviews')
        .select('id')
        .eq('request_id', id)
        .maybeSingle()
      if (data) {
        setHasRated(true)
      }
    }
    checkReview()
  }, [id])

  useEffect(() => {
    if (request?.status === 'completed' && !hasRated) {
      setShowRatingModal(true)
    } else {
      setShowRatingModal(false)
    }
  }, [request?.status, hasRated])

  useEffect(() => {
    if (!mechanic?.id) return
    const supabase = createClient()
    async function loadReviews() {
      const { data } = await supabase
        .from('request_reviews')
        .select(`
          id,
          rating,
          review,
          created_at,
          profiles:driver_id (
            full_name
          )
        `)
        .eq('mechanic_id', mechanic.id)
        .order('created_at', { ascending: false })
        .limit(3)
      setReviews(data || [])
    }
    loadReviews()
  }, [mechanic?.id, hasRated])

  const submitRating = async () => {
    setSubmittingRating(true)
    try {
      const response = await fetch('/api/requests/rate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, rating, review }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save rating')

      toast.success('Thank you for rating your mechanic!')
      setHasRated(true)
      setShowRatingModal(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmittingRating(false)
    }
  }
  const isFixed = serviceMode === 'fixed_location'

  const incidentLocation = request?.incident_location
  const liveDistanceText = useMemo(() => {
    if (!request || ['completed', 'cancelled'].includes(request.status)) return null

    const targetLocation = isFixed 
      ? profileData?.current_location 
      : mechanicLocation

    if (!incidentLocation || !targetLocation) return null
    
    const [driverLat, driverLng] = normalizeGeoPoint(incidentLocation)
    const [targetLat, targetLng] = normalizeGeoPoint(targetLocation)
    
    const distanceKm = calculateHaversineDistance(driverLat, driverLng, targetLat, targetLng)
    return formatDistance(distanceKm)
  }, [request?.status, incidentLocation, mechanicLocation, isFixed, profileData?.current_location])

  // Core orchestration logic handler for secure emergency dispatch cancellation
  async function handleCancelRequest() {
    setShowCancelModal(true)
  }

  async function confirmCancelRequest() {
    try {
      setCanceling(true)
      const response = await fetch(`/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'cancelled',
          cancellationReason: cancelReason.trim() || 'Driver cancelled request'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel request')
      }

      toast.success('Rescue request successfully cancelled.')
      router.push('/dashboard/driver')
    } catch (error) {
      toast.error(error.message || 'An error occurred during cancellation.')
    } finally {
      setCanceling(false)
      setShowCancelModal(false)
    }
  }

  const workflowStages = [
    { key: 'pending', label: 'Finding Help', step: '1' },
    { key: 'accepted', label: 'Assigned', step: '2' },
    { 
      key: 'en_route', 
      label: isFixed ? 'Transit to Shop' : 'On the Way', 
      step: '3' 
    },
    { 
      key: 'arrived', 
      label: isFixed ? 'At Shop' : 'On Site', 
      step: '4' 
    },
    { key: 'in_progress', label: 'Repairing', step: '5' },
    { key: 'completed', label: 'Resolved', step: '6' },
  ]

  const currentStageIndex = workflowStages.findIndex(s => s.key === request?.status)
  const currentStage = workflowStages[currentStageIndex] || workflowStages[0]

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F6F2E7]">
        <Spinner />
      </div>
    )
  }

  if (!request) {
    return (
      <PageWrapper title="Live tracking" description="Follow the assignment in realtime.">
        <Card>
          <p className="text-sm text-muted">Request not found.</p>
        </Card>
      </PageWrapper>
    )
  }

  const isActiveDispatch = ACTIVE_DRIVER_REQUEST_STATUSES.includes(request.status)
  const isCancellationAllowed = CANCELLATION_ALLOWED_STATUSES.includes(request.status)
  const workshopLabel = [
    profileData?.business_name,
    profileData?.location_label,
  ].filter(Boolean).join(' · ')

  const rawRating = profileData?.rating_avg
  const hasRating = typeof rawRating === 'number' && rawRating > 0
  const ratingText = hasRating ? rawRating.toFixed(1) : 'New Responder'

  // Snap height variants for Framer Motion bottom sheet
  const sheetVariants = {
    peek: { height: '15dvh' },
    half: { height: '52dvh' },
    full: { height: '88dvh' },
  }

  return (
    <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden bg-[#F6F2E7]">
      
      {/* ── PERSISTENT TOP PIPELINE PROGRESS BAR (DOCKED UNDER HEADER) ── */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-[#1E1B15]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
          <p className="text-[11px] font-black uppercase tracking-wider text-[#EFE8D4] truncate">
            {currentStage.label} <span className="text-white/40 font-mono font-normal">· Step {currentStage.step} of 6</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {workflowStages.map((stage, idx) => {
            const isPast = idx < currentStageIndex
            const isCurrent = idx === currentStageIndex
            return (
              <div 
                key={stage.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent 
                    ? 'w-5 bg-primary' 
                    : isPast 
                      ? 'w-2 bg-emerald-400' 
                      : 'w-2 bg-white/20'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* ── OFFLINE GRACE PERIOD BANNER ── */}
      {graceTimeLeft !== null && (
        <div className="absolute top-12 left-3 right-3 z-30 rounded-xl border border-red-200 bg-red-50/95 backdrop-blur-md p-3 text-xs font-bold text-red-800 flex items-center gap-2 shadow-lg">
          <AlertTriangle size={15} className="text-red-600 shrink-0" />
          <span className="truncate">
            Mechanic offline. Grace period: {Math.floor(graceTimeLeft / 60)}m {graceTimeLeft % 60}s remaining.
          </span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. BASE LAYER: FULL-BLEED FIXED RESCUE MAP (STAYS 100% UNTOUCHED)    */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <RescueMap
          request={request}
          driverLocation={request.incident_location}
          mechanicLocation={mechanicLocation}
          userRole="driver"
          height="100%"
          showFooter={false}
          className="h-full w-full"
        />
      </div>

      {/* ==================================================================== */}
      {/* 2. MOBILE DRAGGABLE BOTTOM SHEET (RIDE-HAILING STYLE)                */}
      {/* ==================================================================== */}
      <div className="block lg:hidden">
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.y < -60 || velocity.y < -300) {
              if (sheetSnap === 'peek') setSheetSnap('half')
              else if (sheetSnap === 'half') setSheetSnap('full')
            } else if (offset.y > 60 || velocity.y > 300) {
              if (sheetSnap === 'full') setSheetSnap('half')
              else if (sheetSnap === 'half') setSheetSnap('peek')
            }
          }}
          animate={sheetSnap}
          variants={sheetVariants}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-x-0 bottom-0 z-40 bg-[#1E1B15] text-[#EFE8D4] rounded-t-[2rem] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] border-t border-white/10 flex flex-col will-change-transform"
        >
          {/* DRAG HANDLE BAR */}
          <div 
            onClick={() => {
              if (sheetSnap === 'peek') setSheetSnap('half')
              else if (sheetSnap === 'half') setSheetSnap('full')
              else setSheetSnap('peek')
            }}
            className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shrink-0"
          >
            <div className="w-12 h-1.5 rounded-full bg-white/25 transition-colors hover:bg-white/40" />
            <div className="flex items-center gap-1 mt-1 text-[9px] font-mono uppercase tracking-widest text-[#A29A84]">
              <span>{sheetSnap === 'peek' ? 'Pull up for details' : sheetSnap === 'half' ? 'Swipe up/down' : 'Pull down'}</span>
              {sheetSnap === 'peek' ? <ChevronUp size={11} /> : sheetSnap === 'full' ? <ChevronDown size={11} /> : null}
            </div>
          </div>

          {/* ── SNAP STATE 1: PEEK VIEW (~15vh) ── */}
          {sheetSnap === 'peek' && (
            <div className="px-5 pb-4 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary flex items-center gap-1.5">
                  <Radio size={12} className="animate-pulse" /> {currentStage.label}
                </p>
                <h3 className="text-base font-black text-white truncate mt-0.5">
                  {request.status === 'pending'
                    ? 'Broadcasting to nearest mechanics...'
                    : request.status === 'accepted'
                      ? 'Mechanic assigned to request'
                      : request.status === 'en_route'
                        ? (liveDistanceText ? `Mechanic en route (${liveDistanceText})` : 'Mechanic is on the way')
                        : request.status === 'arrived'
                          ? 'Mechanic arrived on site'
                          : request.status === 'in_progress'
                            ? 'Vehicle repair in progress'
                            : 'Rescue complete'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSheetSnap('half')}
                className="flex h-9 items-center justify-center rounded-xl bg-white/10 px-3 text-xs font-bold uppercase tracking-wider text-primary border border-white/10 hover:bg-white/15 shrink-0"
              >
                Expand
              </button>
            </div>
          )}

          {/* ── SNAP STATES 2 & 3: HALF & FULL VIEW (SCROLLABLE CONTAINER) ── */}
          {sheetSnap !== 'peek' && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] space-y-4 min-h-0 text-[#1F1B10]">
              
              {/* DYNAMIC PROXIMITY TELEMETRY CARD */}
              <div className="rounded-[1.75rem] bg-[#1E1B15] p-5 text-[#EFE8D4] shadow-xl border border-white/5 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 text-white/[0.02] pointer-events-none">
                  <Compass size={140} />
                </div>
                
                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className="min-w-0">
                    {request.status === 'pending' ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 animate-pulse">
                          <Radio size={12} /> Broadcast Pipeline Active
                        </p>
                        <h2 className="mt-1 text-xl font-black leading-tight text-[#EFE8D4]">Awaiting nearest mechanics...</h2>
                        <p className="text-xs text-[#A29A84] mt-1">Signals matching across your local district window.</p>
                      </>
                    ) : request.status === 'completed' ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> Service Resolved
                        </p>
                        <h2 className="mt-1 text-2xl font-black leading-none text-emerald-400">Completed</h2>
                        <p className="text-xs text-[#A29A84] mt-1">The rescue service has been successfully completed.</p>
                      </>
                    ) : request.status === 'cancelled' ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 flex items-center gap-1.5">
                          <XCircle size={12} /> Request Cancelled
                        </p>
                        <h2 className="mt-1 text-2xl font-black leading-none text-red-400">Cancelled</h2>
                        <p className="text-xs text-[#A29A84] mt-1">This rescue request was cancelled.</p>
                      </>
                    ) : request.status === 'arrived' ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
                          <Zap size={12} /> Touchdown
                        </p>
                        <h2 className="mt-1 text-xl font-black leading-tight text-[#EFE8D4]">Mechanic is on site</h2>
                        <p className="text-xs text-[#A29A84] mt-1">Verify credentials before field adjustments initiate.</p>
                      </>
                    ) : request.status === 'in_progress' ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
                          <Wrench size={12} /> Maintenance Mode
                        </p>
                        <h2 className="mt-1 text-xl font-black leading-tight text-[#EFE8D4]">Recovery under execution</h2>
                        <p className="text-xs text-[#A29A84] mt-1">Your vehicle service log is actively updating.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
                          <MapPin size={12} />
                          {isFixed ? 'Workshop Proximity' : 'Intercept Proximity'}
                        </p>
                        <h2 className="mt-1 text-2xl font-black leading-none text-white font-mono">
                          {liveDistanceText ? liveDistanceText : 'Calculating...'}
                        </h2>
                        <p className="text-xs text-[#A29A84] mt-1.5">
                          {isFixed ? 'Static distance to the workshop location.' : 'Live gap parameter spacing to your breakdown coordinate asset.'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className={`rounded-2xl p-3.5 ${request.status === 'pending' ? 'bg-primary/10 text-primary animate-spin duration-10000' : 'bg-white/5 text-white'}`}>
                    <Clock3 size={24} />
                  </div>
                </div>
              </div>

              {/* STAGE PIPELINE STEPPER */}
              <div className="rounded-2xl bg-[#FFFBF4] p-4 border border-[#DCCDA9] shadow-xs">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7C6B44] mb-3">Rescue Operation Pipeline</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {workflowStages.map((stage, idx) => {
                    const isPast = idx < currentStageIndex
                    const isCurrent = idx === currentStageIndex
                    return (
                      <div 
                        key={stage.key} 
                        className={`rounded-xl p-2 border text-center transition-all ${
                          isCurrent 
                            ? 'border-primary bg-primary/15 ring-1 ring-primary/30' 
                            : isPast 
                              ? 'border-[#DCCDA9]/60 bg-[#FFF9EF] opacity-80' 
                              : 'border-[#DCCDA9]/30 bg-[#FFF9EF]/40 opacity-40'
                        }`}
                      >
                        <div className="flex justify-center mb-1">
                          {isPast ? (
                            <CheckCircle2 size={13} className="text-emerald-600" />
                          ) : (
                            <span className={`text-[10px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center ${isCurrent ? 'bg-[#1E1B15] text-primary' : 'bg-[#EADFCA] text-[#7C6B44]'}`}>
                              {stage.step}
                            </span>
                          )}
                        </div>
                        <p className={`text-[9.5px] font-black uppercase tracking-tight ${isCurrent ? 'text-[#1E1B15]' : 'text-[#7C6B44]'}`}>
                          {stage.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* RESPONDER IDENTITY CARD */}
              {mechanic && isActiveDispatch && (
                <div className="rounded-2xl bg-[#FFFBF4] border border-[#DCCDA9] overflow-hidden shadow-xs">
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[#7C6B44]">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1E1B15]">Verified Responder Attached</span>
                    </div>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1E1B15] text-xs font-black text-primary">
                        {mechanic?.full_name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'RR'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#1E1B15]">{mechanic?.full_name || 'Assigned Mechanic'}</p>
                        <p className="mt-0.5 text-xs text-amber-600 font-mono flex items-center gap-1">
                          <Star size={12} className="fill-amber-500 text-amber-500" />
                          <span>{ratingText}</span>
                          <span className="text-[#7C6B44] font-normal">· {workshopLabel || 'Certified Specialist'}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3.5">
                      <a
                        href={mechanic?.phone ? `tel:${mechanic.phone}` : undefined}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#1E1B15] px-3 text-xs font-bold uppercase tracking-wider text-primary active:scale-95 transition-transform"
                      >
                        <PhoneCall size={12} />
                        Voice Call
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsChatOpen(true)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 text-xs font-bold uppercase tracking-wider text-slate-950 active:scale-95 transition-transform cursor-pointer hover:bg-amber-300 shadow-xs"
                      >
                        <MessageSquare size={12} />
                        Chat
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(true)}
                      className="w-full mt-2 h-8 text-xs font-bold uppercase tracking-wider border border-[#DCCDA9] bg-[#FFF9EF] rounded-xl text-[#7C6B44] hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Flag Incident
                    </button>

                    {reviews.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#DCCDA9]/50 space-y-2 text-left">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#7C6B44]">Recent Customer Reviews</p>
                        {reviews.slice(0, 2).map((rev) => (
                          <div key={rev.id} className="text-xs border-b border-[#DCCDA9]/30 pb-1.5 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between text-[#7C6B44]">
                              <span className="font-semibold text-[#1E1B15]">{rev.profiles?.full_name || 'Driver'}</span>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                  <Star key={i} size={11} className="fill-amber-500 text-amber-500" />
                                ))}
                              </div>
                            </div>
                            {rev.review && <p className="text-[#7C6B44] italic mt-0.5 leading-relaxed">&ldquo;{rev.review}&rdquo;</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* INCIDENT DETAILS & ACTIONS */}
              <div className="rounded-2xl bg-[#FFFBF4] p-4 border border-[#DCCDA9] shadow-xs">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C6B44]">Incident Details</p>
                <p className="mt-1 text-xs font-medium text-[#1E1B15] leading-relaxed">{request.problem_description}</p>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-[#7C6B44] border-t border-[#DCCDA9]/50 pt-2">
                  <MapPin size={12} className="text-primary shrink-0" />
                  <span className="truncate">{request.incident_address || 'Coordinates registered'}</span>
                </div>
                
                <div className="mt-3.5 space-y-2">
                  {isCancellationAllowed && (
                    <button
                      type="button"
                      onClick={handleCancelRequest}
                      disabled={canceling}
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-red-50 text-xs font-bold uppercase tracking-wider text-red-600 border border-red-200/60 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <X size={14} className="shrink-0" />
                      {canceling ? 'Processing Cancellation...' : 'Cancel Rescue Request'}
                    </button>
                  )}
                  <Link href="/dashboard/driver" className="flex h-10 w-full items-center justify-center rounded-xl bg-[#FFF9EF] border border-[#DCCDA9] text-xs font-bold uppercase tracking-wider text-[#1E1B15] hover:bg-[#F5EED9] transition-colors">
                    Exit Tracking screen
                  </Link>
                </div>
              </div>

              {/* ALTERNATIVE TRANSPORTATION GATEWAY (COLLAPSIBLE / ON-DEMAND IN HALF/FULL) */}
              <div className="rounded-2xl bg-[#FFFBF4] border border-[#DCCDA9] p-3.5">
                <button
                  type="button"
                  onClick={() => setShowAlternativeTransit(prev => !prev)}
                  className="w-full flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#1E1B15] text-primary flex items-center justify-center shrink-0">
                      <BusFront size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#1E1B15] group-hover:text-amber-700 transition-colors">Need another way there?</p>
                      <p className="text-[10px] text-[#7C6B44]">Book Yango, Bolt, or Uber while waiting</p>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-[#7C6B44] transition-transform ${showAlternativeTransit ? 'rotate-180' : ''}`} />
                </button>

                {showAlternativeTransit && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#DCCDA9]/60">
                    <a href="https://passenger.yango.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#DCCDA9] bg-[#FFF9EF] text-center text-[11px] font-bold transition-all hover:bg-[#F5EED9] active:scale-95 shadow-xs">
                      <span className="flex items-center gap-1 text-[#EF4444]">
                        <span className="h-3.5 w-3.5 rounded-sm bg-[#EF4444] flex items-center justify-center text-[8px] text-white font-black">Y</span>
                        Yango
                      </span>
                    </a>
                    <a href="https://bolt.eu" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#DCCDA9] bg-[#FFF9EF] text-center text-[11px] font-bold transition-all hover:bg-[#F5EED9] active:scale-95 shadow-xs">
                      <span className="flex items-center gap-1 text-[#10B981]">
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M13 2v9h8L11 22v-9H3l10-10z"/></svg>
                        Bolt
                      </span>
                    </a>
                    <a href="https://www.uber.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#DCCDA9] bg-[#FFF9EF] text-center text-[11px] font-bold transition-all hover:bg-[#F5EED9] active:scale-95 shadow-xs">
                      <span className="flex items-center gap-1 text-[#1E1B15]">
                        <span className="h-3.5 w-3.5 rounded-full bg-[#1E1B15] flex items-center justify-center text-[8px] text-white font-black">U</span>
                        Uber
                      </span>
                    </a>
                  </div>
                )}
              </div>

              {request.ai_diagnostic_result && (
                <div className="rounded-2xl bg-[#FFFBF4] p-4 border border-[#DCCDA9] shadow-xs">
                  <DiagnosticResult diagnosis={request.ai_diagnostic_result} />
                </div>
              )}

            </div>
          )}
        </motion.div>
      </div>

      {/* ==================================================================== */}
      {/* 3. DESKTOP FLOATING SIDEBAR PANEL (RESPONSIVE OVERLAY)               */}
      {/* ==================================================================== */}
      <div className="hidden lg:block absolute top-14 left-6 bottom-6 w-96 z-30 overflow-y-auto space-y-4 pointer-events-auto pr-1">
        <Card className="border-slate-200 bg-white/95 backdrop-blur-md shadow-lg p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dispatch Track ID</p>
            <Badge label={request.status} variant={request.status} dot />
          </div>
          <p className="mb-3 mt-1 text-[11px] text-slate-400 font-medium">Logged {timeAgo(request.created_at)}</p>
          
          {/* DESKTOP PROGRESS PIPELINE */}
          <div className="space-y-2 border-t border-slate-100 pt-3 mt-3">
            {workflowStages.map((stage, idx) => {
              const isPast = idx < currentStageIndex
              const isCurrent = idx === currentStageIndex
              return (
                <div key={stage.key} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isCurrent ? 'bg-amber-50/60 border border-amber-200' : ''}`}>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCurrent ? 'bg-slate-900 text-primary' : isPast ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isPast ? <CheckCircle2 size={12} /> : stage.step}
                  </div>
                  <span className={`text-xs font-bold ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>{stage.label}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {mechanic && isActiveDispatch && (
          <Card className="border-slate-900 bg-slate-950/95 backdrop-blur-md text-white relative overflow-hidden shadow-lg p-5">
            <div className="absolute top-3 right-3 text-white/5">
              <Shield size={32} />
            </div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Operator</p>
            <div className="flex items-center gap-3">
              <Avatar name={mechanic.full_name} src={mechanic.avatar_url} online />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate">{mechanic.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{workshopLabel || 'Certified recovery specialist'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2 mt-4 relative z-10">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={mechanic?.phone ? `tel:${mechanic.phone}` : undefined}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-slate-100 transition-transform active:scale-95 text-center"
                >
                  <PhoneCall size={12} />
                  Call
                </a>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 transition-transform active:scale-95 cursor-pointer text-center shadow-xs"
                >
                  <MessageSquare size={12} />
                  Live Chat
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="text-xs text-slate-400 hover:text-red-400 font-medium underline underline-offset-4 text-center mt-1 transition-colors"
              >
                Report
              </button>
            </div>
          </Card>
        )}

        <Card className="border-slate-200 bg-white/95 backdrop-blur-md shadow-lg p-5">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Incident Details</p>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">{request.problem_description}</p>
          <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <MapPin size={12} className="text-primary shrink-0" />
            <span>Address: <span className="text-slate-800 font-bold">{request.incident_address || 'Stored'}</span></span>
          </p>
          
          <div className="mt-4 space-y-2">
            {isCancellationAllowed && (
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={canceling}
                className="w-full flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {canceling ? 'Processing Cancellation...' : 'Cancel Request'}
              </button>
            )}
            <Link href="/dashboard/driver" className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all">
              Return to Control Panel
            </Link>
          </div>
        </Card>

        {/* DESKTOP ALTERNATIVE TRANSPORT */}
        <Card className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-md shadow-lg p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alternative Commute</p>
            <BusFront size={14} className="text-slate-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <a href="https://passenger.yango.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-[10.5px] font-bold transition-all hover:bg-slate-50 active:scale-95 text-[#EF4444]">
              Yango
            </a>
            <a href="https://bolt.eu" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-[10.5px] font-bold transition-all hover:bg-slate-50 active:scale-95 text-[#10B981]">
              Bolt
            </a>
            <a href="https://www.uber.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-[10.5px] font-bold transition-all hover:bg-slate-50 active:scale-95 text-black">
              Uber
            </a>
          </div>
        </Card>

        {request.ai_diagnostic_result && (
          <Card className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-md shadow-lg p-5">
            <DiagnosticResult diagnosis={request.ai_diagnostic_result} />
          </Card>
        )}
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        requestId={id}
        reporterId={user?.id}
      />

      {/* CANCELLATION DIALOG MODAL */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setCancelReasonCategory('')
          setCancelReason('')
        }}
        title="Cancel Rescue Request?"
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
              Keep Request
            </Button>
            <Button 
              variant="danger"
              size="sm"
              onClick={confirmCancelRequest}
              disabled={canceling || !cancelReasonCategory}
              loading={canceling}
              className="text-xs font-bold uppercase tracking-wider px-4"
            >
              Confirm Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-[#FFF9EF] border border-[#E8DCC0] p-3 text-xs text-[#6C5E3B] font-medium leading-relaxed">
            Please let us know why you are cancelling. This helps optimize dispatcher routing.
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

      {/* RATING DIALOG MODAL */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Rate Your Experience"
        size="sm"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRatingModal(false)}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Skip
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submitRating}
              disabled={submittingRating}
              loading={submittingRating}
              className="text-xs font-bold uppercase tracking-wider px-4 bg-primary text-slate-900 hover:bg-primary/90 shadow-sm"
            >
              Submit Review
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <Avatar name={mechanic?.full_name || 'Mechanic'} src={mechanic?.avatar_url} size="xl" />
          </div>
          <div>
            <h4 className="text-base font-black text-[#1F1B10] tracking-tight">Rescue Complete</h4>
            <p className="text-xs text-[#7C6B44] mt-1 leading-relaxed">
              How was your service with <strong>{mechanic?.full_name || 'your mechanic'}</strong>?
            </p>
          </div>

          <div className="flex justify-center gap-2 text-amber-500 py-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <Star size={26} className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
              </button>
            ))}
          </div>

          <Textarea
            label="Feedback (Optional)"
            id="rating-feedback"
            rows={3}
            placeholder="Tell us about the service quality..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="p-3 text-xs bg-[#FFFBF7] text-[#1F1B10] border-[#DDD0A8] text-left"
          />
        </div>
      </Modal>

      {/* LIVE CHAT MODAL */}
      <RescueChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        requestId={id}
        contactName={mechanic?.full_name || 'Assigned Mechanic'}
        contactRole="Mechanic"
        statusText={`${currentStage.label} · Step ${currentStage.step} of 6`}
        initialStatus={request?.status}
      />
    </div>
  )
}