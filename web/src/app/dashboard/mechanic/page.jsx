'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { timeAgo } from '@/lib/utils'
import { Radio, AlertCircle, Wrench, DollarSign, ShieldCheck, X, AlertTriangle, MapPin, Star, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMechanicStatus } from '@/hooks/useMechanicStatus'
import { useMechanicVerificationAccess } from '@/hooks/useMechanicVerificationAccess'
import MechanicTour from '@/components/onboarding/mechanic-tour'

const RescueMap = dynamic(
  () => import('@/components/map/RescueMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[370px] flex items-center justify-center bg-slate-50 border rounded-2xl">
        <Spinner />
      </div>
    ),
  }
)

export default function MechanicPage() {
  const { user } = useAuth()
  const [incomingJobs, setIncomingJobs] = useState([])
  const [activeJobs, setActiveJobs] = useState([])
  const [mechProfile, setMechProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [jobSearchResults, setJobSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  const userIdRef = useRef(user?.id)
  const searchParams = useSearchParams()
  const { isAvailable, updateStatus, localCoords } = useMechanicStatus(user?.id)
  const { isApproved, isRejected, isUnverified, rejectionReason } = useMechanicVerificationAccess(user?.id)

  useEffect(() => {
    const q = searchParams.get('search') || ''
    Promise.resolve().then(() => {
      setSearchQuery(q)
    })
  }, [searchParams])

  useEffect(() => {
    userIdRef.current = user?.id
    if (!userIdRef.current) return
    let mounted = true

    async function loadJobs() {
      const currentUserId = userIdRef.current
      if (!currentUserId) return

      const supabase = createClient()

      const { data: mechanicData, error: profileErr } = await supabase
        .from('mechanic_profiles')
        .select('business_name, years_experience, is_available, rating_avg, rating_count')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (profileErr) console.error('[DB EXCEPTION] Profile fetch:', profileErr.message)

      const { data: pending, error: pendingErr } = await supabase
        .from('rescue_requests')
        .select('id, status, service_type, problem_description, incident_address, incident_location, created_at, mechanic_id')
        .eq('status', 'pending')
        .or(`mechanic_id.is.null,mechanic_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false })

      if (pendingErr) console.error('[DB EXCEPTION] Pending fetch:', pendingErr.message)

      // FIXED: Cleaned and unified the active request tracking assignment query chain
const { data: active, error: activeErr } = await supabase
  .from('rescue_requests')
  .select(`
    id,
    status,
    service_type,
    problem_description,
    incident_address,
    incident_location,
    created_at,
    incident_lat,
    incident_lng,
    driver:profiles!rescue_requests_driver_id_fkey (id, full_name, phone)
  `)
  .eq('mechanic_id', currentUserId)
  .in('status', ['accepted', 'en_route', 'arrived', 'in_progress'])
  .order('created_at', { ascending: false })

      if (activeErr) console.error('[DB EXCEPTION] Active fetch:', activeErr.message)

      if (mounted && userIdRef.current) {
        setMechProfile(mechanicData || null)
        setIncomingJobs(pending || [])
        setActiveJobs(active || [])
        setLoading(false)
      }
    }

    loadJobs()
    const interval = setInterval(loadJobs, 10000)

    const supabase = createClient()
    const channel = supabase
      .channel('mechanic-dashboard-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_requests' },
        () => {
          loadJobs()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    if (!searchQuery) {
      Promise.resolve().then(() => {
        setJobSearchResults([])
        setHasSearched(false)
      })
      return
    }

    let mounted = true
    Promise.resolve().then(() => {
      setSearchLoading(true)
      setHasSearched(true)
    })

    async function searchJobs() {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const json = await res.json()
        if (mounted) setJobSearchResults(json.results || [])
      } catch (err) {
        console.error('[MECHANIC SEARCH]:', err)
      } finally {
        if (mounted) setSearchLoading(false)
      }
    }

    searchJobs()
    return () => { mounted = false }
  }, [searchQuery])

  const handleAvailabilityToggle = async () => {
    if (isAvailable) {
      setShowOfflineModal(true)
    } else {
      try {
        await updateStatus('available')
        toast.success('Duty status configured: Online')
      } catch (e) {
        toast.error('Failed to go online')
      }
    }
  }

  const executeStatusUpdate = async (nextAvailable) => {
    setShowOfflineModal(false)
    try {
      await updateStatus(nextAvailable ? 'available' : 'offline')
      toast.success(`Duty status configured: ${nextAvailable ? 'Online' : 'Offline'}`)
    } catch (err) {
      console.error('[STATUS FAULT]:', err?.message || err)
      toast.error('Failed to update duty status')
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-fit bg-transparent flex items-center justify-center py-12 lg:pl-64">
        <div className="text-center space-y-3">
          <Spinner />
          <p className="text-xs font-mono font-black text-[#7C6B44] uppercase tracking-widest animate-pulse">please wait...</p>
        </div>
      </div>
    )
  }

  // FIXED: Logic gateway mapping targeted parameters seamlessly down onto the map frame
  const targetMapRequest = activeJobs.length > 0 
    ? activeJobs[0] 
    : incomingJobs.length > 0 
      ? incomingJobs[0] 
      : null

  return (
    <PageWrapper 
      title="Service Console" 
      description="Track active roadside service jobs, update job progress states, and accept incoming service requests nearby."
    >
      <MechanicTour />
      <div className="mx-auto flex w-full max-w-full md:max-w-7xl flex-col gap-4 md:gap-6 pb-12 box-border min-w-0 overflow-hidden">
        
        {/* ================= PERSISTENT VERIFICATION BANNER (UNVERIFIED & REJECTED ONLY) ================= */}
        {!isApproved && (isUnverified || isRejected) && (
          <div
            role={isRejected ? 'alert' : 'status'}
            aria-live={isRejected ? 'assertive' : 'polite'}
            className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-all ${
              isRejected
                ? 'bg-red-50/90 border-red-200 text-red-950'
                : 'bg-amber-50/90 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              {isRejected ? (
                <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-snug">
                  {isRejected
                    ? `Verification not approved${rejectionReason ? `: "${rejectionReason}"` : ''}. Please update your credentials.`
                    : 'Your workshop profile is unverified. Submit your credentials to start receiving emergency requests.'}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/mechanic/account"
              className={`shrink-0 inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white transition-all shadow-xs cursor-pointer ${
                isRejected
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isRejected ? 'Update Credentials' : 'Submit Credentials'}
            </Link>
          </div>
        )}

        {/* ================= TOP DISPATCH POOL CONTROLLER ================= */}
        <div 
          data-tour="mechanic-welcome"
          className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 w-full max-w-full min-w-0 box-border overflow-hidden ${isAvailable ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs' : 'bg-[#FAF6EC] border-[#DCCDA9]'}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${isAvailable ? 'bg-emerald-500 text-white border-emerald-400 shadow-2xs' : 'bg-[#EAE0C7] text-slate-600 border-[#D8CCAE]'}`}>
                <Radio size={18} className={isAvailable ? 'animate-pulse' : ''} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50]">Duty Status</span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#1E1B15] tracking-tight break-words">
                  {isAvailable ? 'Online & Receiving Requests' : 'Offline from Dispatch Pool'}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 font-medium">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md border border-emerald-200 capitalize shrink-0">
                    <ShieldCheck size={13} /> Console Stream Secure
                  </span>
                  <span>•</span>
                  <span className="shrink-0 font-medium">Experience: {mechProfile?.years_experience ?? '0'} Years Vetted</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span>{mechProfile?.rating_avg ? Number(mechProfile.rating_avg).toFixed(1) : '5.0'} ({mechProfile?.rating_count ?? 0} reviews)</span>
                  </span>
                </div>
              </div>
            </div>
            <Button 
              variant={isAvailable ? 'outline' : 'primary'} 
              onClick={handleAvailabilityToggle}
              className={`h-10 px-5 font-bold uppercase tracking-wider text-xs rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer ${isAvailable ? 'border-slate-300 bg-white hover:bg-slate-50' : 'bg-primary hover:brightness-105 text-slate-950'}`}
            >
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>
        </div>

        {/* ================= COUNTER GRID ================= */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 w-full max-w-full min-w-0 box-border">
          <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-3.5 sm:p-4.5 shadow-sm min-w-0 w-full max-w-full overflow-hidden box-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-[#8A7A50] truncate">Active Jobs</span>
              <Wrench size={15} className="text-slate-400 shrink-0" />
            </div>
            <p className="mt-1 md:mt-2 text-2xl sm:text-3xl font-black text-[#1E1B15] tracking-tight">{activeJobs.length}</p>
            <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-slate-500 font-medium truncate">
              <span className="md:hidden">In progress</span>
              <span className="hidden md:inline">Assigned requests in progress</span>
            </p>
          </Card>
          
          <Card className={`rounded-2xl p-3.5 sm:p-4.5 shadow-sm border transition-all duration-300 min-w-0 w-full max-w-full overflow-hidden box-border ${incomingJobs.length > 0 && isAvailable ? 'bg-amber-50/40 border-amber-300 shadow-amber-400/5' : 'bg-white border-[#DCCDA9]/70'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-[#8A7A50] truncate">Incoming Requests</span>
              <AlertCircle size={15} className={`shrink-0 ${incomingJobs.length > 0 && isAvailable ? 'text-amber-700' : 'text-slate-400'}`} />
            </div>
            <p className="mt-1 md:mt-2 text-2xl sm:text-3xl font-black text-[#1E1B15] tracking-tight">{incomingJobs.length}</p>
            <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-slate-500 font-medium truncate">
              <span className="md:hidden">Unassigned nearby</span>
              <span className="hidden md:inline">Unassigned breakdowns nearby</span>
            </p>
          </Card>

          {/* Operation Center - Reference info hidden on mobile (below md / 768px) */}
          <Card className="hidden md:block rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm min-w-0 w-full max-w-full overflow-hidden box-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A50]">Operation Center</span>
              <DollarSign size={16} className="text-slate-400" />
            </div>
            <p className="mt-2 text-lg font-black text-[#1E1B15] truncate tracking-tight pt-1">
              {mechProfile?.business_name || 'Independent Specialist'}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 font-medium truncate">Active terminal identity node</p>
          </Card>
        </div>

        {/* ================= PRIMARY CONSOLE WORKING INTERFACE ================= */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-12 w-full max-w-full min-w-0 box-border">
          
          {/* LEFT AREA: MAP MODULE (DESKTOP ONLY) & ACTIVE JOBS */}
          <div className="space-y-4 lg:col-span-7 flex flex-col w-full max-w-full min-w-0 box-border">
            
            {/* Desktop-only Map View */}
            <div className="hidden lg:flex overflow-hidden rounded-2xl border border-[#DCCDA9]/70 bg-white shadow-sm flex-col w-full max-w-full min-w-0 box-border">
              <div className="bg-[#FAF6EC]/90 border-b border-[#E8DFC6]/60 px-4 py-3 flex items-center justify-between z-20">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#8A7A50] block">Live Tracking</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 m-0">Route and Location Feed</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeJobs.length > 0 ? 'Active System Track' : 'Radar Scanning'}
                </span>
              </div>
              
              <div className="w-full h-[370px] relative overflow-hidden bg-slate-50 rounded-b-2xl z-10">
                <RescueMap 
                  request={targetMapRequest} 
                  mechanicLocation={localCoords}
                  incomingJobs={incomingJobs}
                  isRadarMode={activeJobs.length === 0}
                  isOnline={isAvailable}
                  userRole="mechanic"
                  height="100%" 
                />
              </div>
            </div>

            {/* Active Jobs Card */}
            {activeJobs.length > 0 ? (
              <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white shadow-sm p-4 sm:p-5 flex-1 w-full max-w-full min-w-0 box-border overflow-hidden">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Active Assigned Jobs ({activeJobs.length})</h3>
                  </div>
                  <Link 
                    href="/dashboard/mechanic/navigation" 
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-primary transition"
                  >
                    <Navigation size={13} />
                    <span>Open Navigation</span>
                  </Link>
                </div>
                <div className="space-y-3 w-full min-w-0">
                  {activeJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-slate-100 bg-[#FAF6EC]/50 p-3.5 sm:p-4 hover:border-slate-200 transition-all shadow-2xs w-full max-w-full min-w-0 box-border overflow-hidden">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between w-full min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge label={job.status} variant={job.status} dot />
                            <Badge label={job.service_type} variant="default" />
                          </div>
                          <p className="mt-2 text-sm font-bold text-slate-900 leading-snug break-words">{job.problem_description}</p>
                          <p className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1 min-w-0">
                            <MapPin size={12} className="text-slate-400 shrink-0" /> 
                            <span className="truncate">{job.incident_address || 'Location coordinates pending'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                          <Link 
                            href={`/dashboard/mechanic/job/${job.id}`} 
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-white hover:bg-slate-50 border border-slate-200 px-3.5 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors cursor-pointer"
                          >
                            Details
                          </Link>
                          <Link 
                            href="/dashboard/mechanic/navigation" 
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Navigation size={13} />
                            <span>Navigate</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-5 shadow-sm flex flex-col justify-center items-center py-8 text-center text-slate-400 lg:hidden w-full max-w-full min-w-0 box-border overflow-hidden">
                <div className="h-10 w-10 rounded-xl bg-[#FAF6EC] border border-[#E8DFC6] flex items-center justify-center mb-2 text-slate-500 shadow-2xs">
                  <Wrench size={18} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">No Active Assigned Jobs</h4>
                <p className="text-[11px] max-w-xs mt-1 text-slate-500 font-medium leading-relaxed">
                  {isAvailable ? 'Standing by for new dispatches. Check incoming requests below.' : 'You are currently offline. Go online to receive emergency dispatches.'}
                </p>
              </Card>
            )}
          </div>

          {/* RIGHT AREA: INCIDENT BROADCAST FEEDS */}
          <div className="space-y-4 lg:col-span-5 w-full max-w-full min-w-0 box-border">
            <Card className="p-0 overflow-hidden border-[#DCCDA9]/70 bg-white shadow-sm rounded-2xl w-full max-w-full min-w-0 box-border">
              <div className="border-b border-slate-100 bg-slate-900 px-4 py-3 text-white flex justify-between items-center w-full max-w-full min-w-0 box-border">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Urgent Broadcast Feed</h4>
                {incomingJobs.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />}
              </div>
              <div className="p-3.5 sm:p-4 w-full max-w-full min-w-0 box-border">
                {incomingJobs.length === 0 ? (
                  <p className="py-8 text-center text-xs font-medium text-slate-400">No open corridor breakdown alerts right now.</p>
                ) : (
                  <div className="space-y-3 w-full min-w-0">
                    {incomingJobs.map((job) => (
                      <div key={job.id} className="rounded-xl border border-slate-100 bg-[#FAF6EC]/40 p-3 sm:p-3.5 hover:border-slate-200 transition-colors w-full max-w-full min-w-0 box-border overflow-hidden">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <Badge label={job.service_type} variant="pending" dot />
                          <span className="text-[11px] font-medium text-slate-400 shrink-0">{timeAgo(job.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900 break-words">{job.problem_description}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500 truncate">{job.incident_address || 'Location pending'}</p>
                        <Link href={`/dashboard/mechanic/job/${job.id}`} className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-slate-800 transition-all cursor-pointer">
                          Review Request
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-4 sm:p-5 shadow-sm flex flex-col justify-center items-center py-6 text-center text-slate-400 w-full max-w-full min-w-0 box-border overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-[#FAF6EC] border border-[#E8DFC6] flex items-center justify-center mb-2 text-slate-500 shadow-2xs">
                <AlertCircle size={16} />
              </div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {isAvailable ? 'Network Dispatch Node Active' : 'Dispatch Node Inactive (Offline)'}
              </h4>
              <p className="text-[11px] max-w-xs mt-1 text-slate-500 font-medium leading-relaxed">
                {isAvailable 
                  ? 'When active, your unit is visible to stranded drivers within your service radius.' 
                  : 'Switch your duty status to Online to appear on the dispatch radar.'}
              </p>
            </Card>
          </div>

        </div>
      </div>

      <Modal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        title="Disconnect from Dispatch?"
        size="sm"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeStatusUpdate(false)}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 hover:bg-red-50/50 cursor-pointer"
            >
              Confirm Offline
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowOfflineModal(false)}
              className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-primary hover:bg-primary/90 shadow-sm cursor-pointer"
            >
              Stay Online
            </Button>
          </>
        }
      >
        <div className="rounded-xl bg-[#FFF9EF] border border-[#E8DCC0] p-4">
          <p className="text-xs text-[#6C5E3B] font-medium leading-relaxed">
            Going offline removes your workshop profile from the active emergency network. You will not receive nearby breakdown alerts until you reconnect.
          </p>
        </div>
      </Modal>

      {hasSearched && (
        <Card className="rounded-2xl border-slate-200 bg-white p-4 sm:p-5 shadow-sm w-full max-w-full min-w-0 box-border overflow-hidden">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
            Job search results for &quot;{searchQuery}&quot;
          </h3>
          {searchLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : jobSearchResults.length === 0 ? (
            <p className="text-xs font-medium text-slate-400 text-center py-6">No matching jobs found.</p>
          ) : (
            <div className="space-y-3 w-full min-w-0">
              {jobSearchResults.map((job) => (
                <Link key={job.id} href={`/dashboard/mechanic/job/${job.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 hover:border-slate-200 transition-all w-full max-w-full min-w-0 box-border overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={job.status} variant={job.status} dot />
                      <span className="text-[11px] font-medium text-slate-400">{timeAgo(job.created_at)}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-slate-900 leading-snug">{job.problem_description}</p>
                    <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={11} className="text-slate-400" /> {job.incident_address || 'GPS active'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
    </PageWrapper>
  )
}