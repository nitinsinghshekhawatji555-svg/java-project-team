'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CarFront, Fuel, Wrench, MapPin, Star, AlertTriangle } from 'lucide-react'

import RequestStatusBadge from '@/components/request/RequestStatusBadge'
import RescueMap from '@/components/map/RescueMap'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'

export default function DriverDashboard() {
  const { user, profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const [mechanicResults, setMechanicResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    let mounted = true

    async function loadRequests() {
      const supabase = createClient()
      const { data } = await supabase
        .from('rescue_requests')
        .select('id, status, service_type, problem_description, incident_address, created_at, accepted_at')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      if (mounted) {
        setRequests(data || [])
        setLoading(false)
      }
    }

    loadRequests()

    return () => {
      mounted = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!searchQuery) {
      Promise.resolve().then(() => {
        setMechanicResults([])
        setHasSearched(false)
      })
      return
    }

    let mounted = true
    Promise.resolve().then(() => {
      setSearchLoading(true)
      setHasSearched(true)
    })

    async function loadMechanics() {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const json = await res.json()
        if (mounted) setMechanicResults(json.results || [])
      } catch (err) {
        console.error('[DRIVER SEARCH]:', err)
      } finally {
        if (mounted) setSearchLoading(false)
      }
    }

    loadMechanics()
    return () => { mounted = false }
  }, [searchQuery])

  const activeRequest = requests.find((request) => !['completed', 'cancelled'].includes(request.status))

  const progressByStatus = {
    pending: 20,
    accepted: 55,
    en_route: 75,
    arrived: 92,
    in_progress: 92,
    completed: 100,
    cancelled: 100,
  }

  const progress = progressByStatus[activeRequest?.status] || 20
  const vehicleLabel = [profile?.vehicle_make, profile?.vehicle_model].filter(Boolean).join(' ') || 'Link vehicle profile'
  const membershipId = profile?.vehicle_plate || profile?.id?.substring(0, 8) || '—'
  const quickTiles = [
    { label: 'Vehicle Info', value: vehicleLabel, href: '/dashboard/driver/account', icon: CarFront },
    { label: 'Explore & Fuel', value: 'Live mechanics & fuel map', href: '/dashboard/driver/explore', icon: Fuel },
  ]

  const recentItems = requests.slice(0, 2)

  return (
    <div className="w-full flex-grow bg-transparent text-[#1F1B10] px-1 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-6 md:pt-6 md:px-0 flex justify-center items-start lg:pb-8">
      <div className="w-full max-w-2xl flex flex-col gap-4">


        {/* Active Membership Identifier Pill */}
        <div className="rounded-xl border border-[#DCCDA9] bg-white px-4 py-2.5 text-xs font-bold tracking-wider text-[#7C6B44] flex justify-between items-center shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Active Membership
          </span>
          <span className="font-mono text-[11px] text-slate-500">ID: {membershipId}</span>
        </div>

        {/* Core CTA Action Portal Layer */}
        <div className="rounded-2xl bg-[#1F1B10] p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wrench size={80} />
          </div>
          <h3 className="mt-1 text-2xl font-black tracking-tight">Need Help Now?</h3>
          <p className="mt-1 text-xs text-white/60">Get connected to nearby certified mechanics with live dispatch tracking.</p>
         
        </div>

        {/* Quick Info Parameter Action Grid */}
        <div className="grid grid-cols-2 gap-3">
          {quickTiles.map((tile) => {
            const Icon = tile.icon
            return (
              <Link key={tile.label} href={tile.href} className="rounded-2xl border border-[#DCCDA9] hover:border-[#BCA878] bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:bg-[#FFFBF4] transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF9EF] border border-[#DCCDA9] text-[#7C6B44]">
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-black text-[#1F1B10]">{tile.label}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium truncate">{tile.value}</p>
              </Link>
            )
          })}
        </div>

        {/* Live Active Incident Ticket Tracker Panel */}
        {activeRequest && (
          <div className="space-y-3">
            <div className="border-l-4 border-l-primary bg-[#1F1B10] p-4 text-white rounded-r-2xl shadow-sm">
              <span className="rounded-md bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#1F1B10]">
                Live Dispatch Unit: {activeRequest.status}
              </span>
              <div className="mt-3 space-y-1">
                <h4 className="font-mono text-base font-black text-amber-400">Emergency ID #{activeRequest.id?.substring(0,8)}</h4>
                <p className="text-xs text-white/70 leading-relaxed">{activeRequest.problem_description}</p>
                <p className="text-[11px] font-mono text-white/40 pt-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-white/40 shrink-0" />
                  <span>{activeRequest.incident_address || 'Location identified'}</span>
                </p>
              </div>
            </div>

            {/* Transit Tracking Progress Bar */}
            <div className="bg-white border border-[#DCCDA9] p-4 rounded-2xl shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <span>1. Matching</span>
                <span>2. Accepted</span>
                <span>3. En Route</span>
                <span>4. Cleared</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            
          </div>
        )}

        {/* Recent Activity Logs Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7C6B44]">Recent Incident Logs</h4>
            <Link href="/dashboard/driver/history" className="text-xs font-bold text-amber-700 hover:underline">View All</Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#DCCDA9] bg-white p-5 text-xs font-medium text-slate-400 text-center animate-pulse">Loading activity logs...</div>
          ) : recentItems.length === 0 ? (
            <div className="rounded-2xl border border-[#DCCDA9] bg-white p-5 text-xs font-medium text-slate-400 text-center">No active roadside requests logged.</div>
          ) : (
            recentItems.map((request) => (
              <Link key={request.id} href={`/dashboard/driver/request/${request.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-[#DCCDA9] bg-white p-4 shadow-sm active:bg-slate-50 transition">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#1F1B10] capitalize">{request.service_type?.replace('_', ' ')}</p>
                  <p className="truncate text-xs text-slate-400 mt-0.5">{timeAgo(request.created_at)} · {request.incident_address || 'Accra Central'}</p>
                </div>
                <RequestStatusBadge status={request.status} />
              </Link>
            ))
          )}
        </div>

        {/* Safety Directive Guidelines Footer Layer */}
        <div className="rounded-2xl border border-[#DCCDA9] bg-[#1F1B10] p-4 text-white shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">Emergency Safety Protocol</span>
            <AlertTriangle size={15} className="text-amber-400" />
          </div>
          <div className="pt-3 text-center">
            <p className="text-xs text-white/80 font-medium">
              Activate hazard indicators immediately. Disembark the vehicle toward the safety shoulder, clear of active transit lanes, and wear high-visibility gear.
            </p>
          </div>
        </div>

        {hasSearched && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7C6B44]">
              Mechanic search results {searchQuery && `for "${searchQuery}"`}
            </h4>
            {searchLoading ? (
              <Card className="rounded-2xl border border-[#DCCDA9] bg-white p-6 flex justify-center shadow-sm">
                <Spinner />
              </Card>
            ) : mechanicResults.length === 0 ? (
              <Card className="rounded-2xl border border-[#DCCDA9] bg-white p-6 text-center shadow-sm">
                <p className="text-xs font-medium text-slate-400">No mechanics matched your search.</p>
              </Card>
            ) : (
              mechanicResults.map((mech) => (
                <Card key={mech.user_id} className="rounded-2xl border border-[#DCCDA9] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#1F1B10]">{mech.business_name || 'Independent Specialist'}</p>
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" /> {mech.location_label || 'Zone active'}
                      </p>
                      {mech.specializations && mech.specializations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {mech.specializations.map((spec, idx) => (
                            <Badge key={idx} label={spec} variant="default" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        {mech.rating_avg?.toFixed(1) || 'New'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}