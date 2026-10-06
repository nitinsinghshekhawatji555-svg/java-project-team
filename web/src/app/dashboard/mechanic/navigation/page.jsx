'use client'

import { useState, useEffect, useRef } from 'react'
import RescueMap from '@/components/map/RescueMap'
import FullBleedMapShell from '@/components/map/FullBleedMapShell'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useMechanicStatus } from '@/hooks/useMechanicStatus'
import { useBroadcastLocation } from '@/hooks/useMechanicLocation'
import { 
  Navigation, 
  Radio, 
  MapPin, 
  Phone, 
  User, 
  Compass, 
  AlertCircle, 
  ShieldCheck, 
  Wrench, 
  Building2,
  ChevronRight
} from 'lucide-react'

export default function MechanicNavigationPage() {
  const { user } = useAuth()
  const [activeJob, setActiveJob] = useState(null)
  const [mechProfile, setMechProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const userIdRef = useRef(user?.id)

  // 1. Monitor availability and location status maps
  const { isAvailable, updateStatus, localCoords } = useMechanicStatus(user?.id)

  // 2. Initialize active real-time channel location broadcasting (strictly halted if offline)
  const { broadcastError } = useBroadcastLocation(activeJob?.id, user?.id, activeJob?.status, isAvailable)

  // Poll for incoming active assignments or states and fetch mechanic profile
  useEffect(() => {
    userIdRef.current = user?.id
    if (!userIdRef.current) return
    let mounted = true

    async function loadActiveRouteAndProfile() {
      const currentUserId = userIdRef.current
      if (!currentUserId) return

      const supabase = createClient()
      
      const [jobRes, profileRes] = await Promise.all([
        supabase
          .from('rescue_requests')
          .select(`
            id,
            status,
            service_type,
            problem_description,
            incident_address,
            incident_location,
            created_at,
            driver:driver_id (id, full_name, phone)
          `)
          .eq('mechanic_id', currentUserId)
          .in('status', ['accepted', 'en_route', 'arrived', 'in_progress'])
          .maybeSingle(),
        supabase
          .from('mechanic_profiles')
          .select('business_name, service_mode, base_location, base_location_label, show_base_location_offline, location_label')
          .eq('user_id', currentUserId)
          .maybeSingle()
      ])

      if (mounted && userIdRef.current) {
        setActiveJob(jobRes.data || null)
        setMechProfile(profileRes.data || null)
        setLoading(false)
      }
    }

    loadActiveRouteAndProfile()
    const interval = setInterval(loadActiveRouteAndProfile, 5000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user?.id])

  const quickUpdateStatus = async (newStatus) => {
    if (!activeJob) return
    setUpdating(true)
    const response = await fetch('/api/requests/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: activeJob.id, newStatus }),
    })

    const result = await response.json()
    if (response.ok && result.request) {
      setActiveJob(result.request)
    } else {
      alert(result.error || 'Unable to sync navigation step')
    }
    setUpdating(false)
  }

  const driverCoords = activeJob?.incident_location?.coordinates 
    ? `${activeJob.incident_location.coordinates[1]?.toFixed(4)}, ${activeJob.incident_location.coordinates[0]?.toFixed(4)}`
    : activeJob?.incident_address || 'Waiting for dispatch'

  const locationLabel = isAvailable 
    ? (localCoords ? `${localCoords.lat.toFixed(4)}, ${localCoords.lng.toFixed(4)}` : 'Acquiring GPS...')
    : (mechProfile?.base_location ? 'Shop Base (Offline)' : 'Offline (Standby)')

  // -------------------------------------------------------------
  // TOP OVERLAY: Floating status pill
  // -------------------------------------------------------------
  const topOverlay = (
    <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[#DCCDA9] shadow-lg flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${
          activeJob 
            ? 'bg-amber-50 text-amber-600 border-amber-200' 
            : isAvailable 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
              : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {activeJob ? (
            <Compass size={16} className="animate-spin" style={{ animationDuration: '4s' }} />
          ) : isAvailable ? (
            <Radio size={16} className="animate-pulse" />
          ) : (
            <Radio size={16} />
          )}
        </div>
        <div className="min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#7C6B44] block">
            {activeJob ? 'Active Navigation' : 'Status'}
          </span>
          <p className="text-xs font-black text-[#1F1B10] truncate">
            {activeJob 
              ? 'Live Satellite Navigation' 
              : isAvailable 
                ? 'Standby Scanning (Online)' 
                : 'Core Grid Standby (Offline)'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeJob ? (
          <Badge label={activeJob.status?.replace('_', ' ')} variant={activeJob.status} dot />
        ) : isAvailable ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        ) : (
          <button
            onClick={async () => {
              try {
                await updateStatus('available')
              } catch (e) {
                console.error(e)
              }
            }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
          >
            <span>Go Online</span>
          </button>
        )}
      </div>
    </div>
  )

  // -------------------------------------------------------------
  // CONTROL OVERLAY: Floating Recenter button
  // -------------------------------------------------------------
  const controlOverlay = (
    <button
      onClick={() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(() => {})
        }
      }}
      className="h-11 w-11 bg-white/95 text-slate-700 rounded-2xl border border-[#DCCDA9] shadow-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
      title="Re-center on GPS position"
      aria-label="Re-center on GPS position"
    >
      <Compass size={22} className="text-[#7C6B44]" />
    </button>
  )

  // -------------------------------------------------------------
  // BOTTOM OVERLAY: Floating drawer & coordinates
  // -------------------------------------------------------------
  const bottomOverlay = (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#DCCDA9] shadow-2xl overflow-hidden p-4 sm:p-5 space-y-3 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
      
      {/* 1. Coordinate Summary Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 text-xs">
        <div className="min-w-0">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Incident Vector</span>
          <p className="font-mono font-bold text-slate-800 mt-0.5 text-xs truncate">
            {driverCoords}
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Your Location</span>
          <p className="font-mono font-bold text-slate-800 mt-0.5 text-xs truncate">
            {locationLabel}
          </p>
        </div>
      </div>

      {/* 2. Active Job Content or Standby Guidance */}
      {activeJob ? (
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-900 break-words">{activeJob.driver?.full_name || 'Anonymous User'}</p>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 uppercase">
                    {activeJob.service_type?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {activeJob.incident_address || 'Target vector assigned'}
                </p>
              </div>
            </div>

            {activeJob.driver?.phone && (
              <a
                href={`tel:${activeJob.driver.phone}`}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-slate-800 transition-colors self-start sm:self-center"
              >
                <Phone size={13} />
                <span>Call Driver</span>
              </a>
            )}
          </div>

          {/* Quick Action Progression Buttons */}
          <div className="pt-1">
            {activeJob.status === 'accepted' && (
              <Button onClick={() => quickUpdateStatus('en_route')} disabled={updating} className="w-full text-xs uppercase tracking-wider py-2.5 font-bold" variant="secondary">
                {updating ? 'Processing...' : 'Mark En Route'}
              </Button>
            )}
            {activeJob.status === 'en_route' && (
              <Button onClick={() => quickUpdateStatus('arrived')} disabled={updating} className="w-full text-xs uppercase tracking-wider py-2.5 font-bold" variant="secondary">
                {updating ? 'Processing...' : 'Signal Arrival'}
              </Button>
            )}
            {activeJob.status === 'arrived' && (
              <Button onClick={() => quickUpdateStatus('in_progress')} disabled={updating} className="w-full text-xs uppercase tracking-wider py-2.5 font-bold" variant="secondary">
                {updating ? 'Processing...' : 'Commence Work'}
              </Button>
            )}
            {activeJob.status === 'in_progress' && (
              <Button onClick={() => quickUpdateStatus('completed')} disabled={updating} className="w-full text-xs uppercase tracking-wider py-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                {updating ? 'Processing...' : 'Finalize Job'}
              </Button>
            )}
          </div>
        </div>
      ) : mechProfile?.service_mode === 'fixed_location' ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 size={15} className="text-amber-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 truncate">
                {mechProfile.business_name || 'Workshop Location'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Shop Mode
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            {mechProfile.base_location_label || mechProfile.location_label || 'Registered Workshop Base Point'}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 pt-1">
          {isAvailable ? (
            <>
              <div className="h-7 w-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck size={15} />
              </div>
              <p className="text-xs font-medium text-slate-600 leading-snug">
                Radar matrix scanning active for corridor breakdown distress signals within 15km.
              </p>
            </>
          ) : (
            <>
              <div className="h-7 w-7 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <AlertCircle size={15} />
              </div>
              <p className="text-xs font-medium text-slate-500 leading-snug">
                Duty status is currently offline. Tap &quot;Go Online&quot; above to connect to the dispatch grid.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <FullBleedMapShell
      topOverlay={topOverlay}
      controlOverlay={controlOverlay}
      bottomOverlay={bottomOverlay}
    >
      {loading ? (
        <div className="h-full w-full flex items-center justify-center bg-[#F6F2E7]">
          <Spinner />
        </div>
      ) : (
        <RescueMap 
          request={activeJob} 
          mechanicLocation={localCoords} 
          userRole="mechanic"
          isOnline={isAvailable}
          showFooter={false}
          className="h-full w-full"
          height="100%" 
        />
      )}
    </FullBleedMapShell>
  )
}
