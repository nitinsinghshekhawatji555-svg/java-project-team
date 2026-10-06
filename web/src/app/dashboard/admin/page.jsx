'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic' // Added for safe server-side rendering exclusion

import { 
  Bell, CarFront, ClipboardList, Radar, ShieldCheck, 
  Users, Wrench, ChevronDown, ChevronUp, Radio, Network,
  MapPin, User, HardHat, ArrowRight
} from 'lucide-react'

import AdminEscalation from '@/components/admin/AdminEscalation'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import PageWrapper from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import Spinner from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'

// Lazy-load the Leaflet container to completely prevent browser global window crashes during SSR
const LiveHotspotsMap = dynamic(
  () => import('@/components/admin/LiveHotspotsMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-80 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl">
        <Spinner />
      </div>
    )
  }
)

const quickActions = [
  {
    href: '/dashboard/admin/reviews',
    label: 'Credential Verification',
    description: 'Moderate pending profile updates, field documentation, and registration edits.',
    icon: ShieldCheck,
  },
  {
    href: '/dashboard/admin/requests',
    label: 'Global Incidents Log',
    description: 'Inspect full active lifecycles, historic tickets, and route states.',
    icon: Radar,
  },
  {
    href: '/dashboard/admin/mechanics',
    label: 'Service Provider Roster',
    description: 'Review field service provider profiles before granting dispatch terminal permissions.',
    icon: Wrench,
  },
  {
    href: '/dashboard/admin/users',
    label: 'Identity Framework',
    description: 'Manage platform accounts, security permissions, and operational roles.',
    icon: Users,
  },
]

export default function AdminDashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentRequests, setRecentRequests] = useState([])
  const [pendingMechanics, setPendingMechanics] = useState([])
  const [escalationExpanded, setEscalationExpanded] = useState(false)
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadAdminDashboard() {
      try {
        const [statsResponse, requestsResponse, mechanicsResponse] = await Promise.all([
          fetch('/api/admin/stats', { cache: 'no-store' }),
          fetch('/api/admin/requests?limit=3', { cache: 'no-store' }),
          fetch('/api/admin/mechanics?status=pending&limit=3', { cache: 'no-store' }),
        ])

        const statsPayload = await statsResponse.json()
        const requestsPayload = await requestsResponse.json()
        const mechanicsPayload = await mechanicsResponse.json()

        if (!mounted) return

        if (statsResponse.ok) setStats(statsPayload.stats || null)
        if (requestsResponse.ok) setRecentRequests(requestsPayload.requests || [])
        if (mechanicsResponse.ok) setPendingMechanics(mechanicsPayload.mechanics || [])
      } catch (err) {
        console.error('Failed to sync admin operation feeds:', err)
      }
    }

    loadAdminDashboard()
    const interval = setInterval(loadAdminDashboard, 10000)

    const supabase = createClient()
    const channel = supabase
      .channel('admin-dashboard-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_requests' },
        () => {
          loadAdminDashboard()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mechanic_profiles' },
        () => {
          loadAdminDashboard()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!searchQuery) {
      Promise.resolve().then(() => {
        setSearchResults([])
        setHasSearched(false)
      })
      return
    }

    let mounted = true
    Promise.resolve().then(() => {
      setSearchLoading(true)
      setHasSearched(true)
    })

    async function adminSearch() {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const json = await res.json()
        if (mounted) setSearchResults(json.results || [])
      } catch (err) {
        console.error('[ADMIN SEARCH]:', err)
      } finally {
        if (mounted) setSearchLoading(false)
      }
    }

    adminSearch()
    return () => { mounted = false }
  }, [searchQuery])

  const dashboardStats = [
    { label: 'Total Requests', value: String(stats?.totalRequests ?? 0), note: 'All-time breakdown tickets', icon: ClipboardList },
    { label: 'Active Requests', value: String(stats?.activeRequests ?? 0), note: 'Currently in progress', icon: CarFront },
    { label: 'Completed', value: String(stats?.completedRequests ?? 0), note: 'Resolved rescues', icon: Bell },
    { label: 'Cancelled', value: String(stats?.cancelledRequests ?? 0), note: 'Aborted requests', icon: Bell },
  ]

  return (
    <PageWrapper
      title="Operations Command"
      description="Monitor emergency dispatches, validate credentials, and manage platform scale."
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
        
        {/* ================= HIGH-LEVEL METRICS OVERVIEW ================= */}
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {dashboardStats.map((stat) => {
            const Icon = stat.icon

            return (
              <Card key={stat.label} className="rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50]">{stat.label}</p>
                    <p className="mt-1.5 text-3xl font-black text-[#1E1B15] tracking-tight">{stat.value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 truncate">{stat.note}</p>
                  </div>
                  <div className="rounded-xl border border-[#E8DFC6] bg-[#FAF6EC] p-2 text-slate-700 shadow-2xs shrink-0">
                    <Icon size={16} strokeWidth={2.2} />
                  </div>
                </div>
              </Card>
            )
          })}
        </section>

        {/* ================= LIVE ROUTING MONITOR & MAP MATRIX ================= */}
        <section className="grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
          <Card className="overflow-hidden rounded-2xl border-[#DCCDA9]/70 bg-white shadow-sm p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#FAF6EC]/80 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Global Dispatch Tracker Feed</h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="rounded-lg border border-[#DCCDA9]/60 bg-white px-2.5 py-1 text-slate-700 shadow-2xs">Operations Online</span>
                <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-primary">Live Radar</span>
              </div>
            </div>

            {/* LIVE OPENSTREETMAP TRACKING LAYER CONTAINER */}
            <div className="p-3 bg-slate-50/50">
              <LiveHotspotsMap 
                mechanics={stats?.activeMechanicLocations || []} 
                activeIncidents={stats?.activeIncidents || []} 
              />
            </div>
            
            {/* Dynamic Incident Logging Feeds */}
            <div className="divide-y divide-slate-100 border-t border-slate-100 max-h-48 overflow-y-auto">
              {recentRequests.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs font-medium text-slate-400">No active roadside incidents broadcasted across system sectors.</div>
              ) : (
                recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#FAF6EC]/40 transition-colors">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-xs font-bold text-slate-900 truncate capitalize">{request.problem_description || `${request.service_type?.replace('_', ' ')} breakdown`}</p>
                      <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                        {request.driver?.full_name || 'Anonymous Client'} • {request.incident_address || 'GPS Coordinates Flagged'}
                      </p>
                    </div>
                    <Badge label={request.status} variant={request.status} />
                  </div>
                ))
              )}
            </div>

          </Card>

          {/* RIGHT COLUMNS: VERIFICATION TRAFFIC & ARCHITECTURAL BALANCES */}
          <div className="space-y-4">
            <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50] block">Verification Vectors</span>
              <h3 className="text-sm font-extrabold text-slate-900 mt-2">Identity Hub Backlog</h3>
              <p className="mt-1 text-3xl font-black text-slate-900 tracking-tight">{pendingMechanics.length}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Mechanics awaiting clearance</p>
              <Link
                href="/dashboard/admin/mechanics"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Manage Pending Profiles <ArrowRight size={14} className="ml-2" />
              </Link>
            </Card>

            <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50] block">Performance Metrics</span>
              <h3 className="text-sm font-extrabold text-slate-900 mt-2">Operational KPIs</h3>
              <div className="mt-3 space-y-1.5 text-xs font-semibold">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#FAF6EC]/60 px-3.5 py-2 text-slate-700">
                  <span>Avg response time</span>
                  <span className="text-slate-900 font-bold">{stats?.avgResponseTime ?? 0} mins</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#FAF6EC]/60 px-3.5 py-2 text-slate-700">
                  <span>Avg completion time</span>
                  <span className="text-slate-900 font-bold">{stats?.avgCompletionTime ?? 0} mins</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#FAF6EC]/60 px-3.5 py-2 text-slate-700">
                  <span>Avg rating</span>
                  <span className="text-slate-900 font-bold">{stats?.avgRating ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#FAF6EC]/60 px-3.5 py-2 text-slate-700">
                  <span>Verified mechanics</span>
                  <span className="text-slate-900 font-bold">{stats?.verifiedMechanics ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-3.5 py-2 text-slate-700">
                  <span>Mechanics online</span>
                  <span className="text-emerald-700 font-black">{stats?.activeMechanics ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#FAF6EC]/60 px-3.5 py-2 text-slate-700">
                  <span>Registered drivers</span>
                  <span className="text-slate-900 font-bold">{stats?.totalDrivers ?? 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ================= QUICK ACTIONS GRID ================= */}
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            
            let badgeText = null
            if (action.href === '/dashboard/admin/mechanics' && pendingMechanics.length > 0) {
              badgeText = `${pendingMechanics.length} PENDING`
            } else if (action.href === '/dashboard/admin/requests' && stats?.activeRequests > 0) {
              badgeText = `${stats.activeRequests} ACTIVE`
            }

            return (
              <Link key={action.href} href={action.href} className="group">
                <Card className="h-full rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm transition-all hover:border-[#CDBD97] hover:-translate-y-0.5">
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A7A50]">Console Action</span>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-slate-800 transition-colors">{action.label}</h3>
                        {badgeText && (
                          <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[9px] font-black text-red-600 tracking-wider shrink-0 animate-pulse">
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed pt-1">{action.description}</p>
                    </div>
                    <div className="rounded-xl border border-[#E8DFC6] bg-[#FAF6EC] p-2 text-slate-700 shadow-2xs self-start group-hover:bg-primary group-hover:text-slate-950 transition-all">
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </section>

        {/* ================= INCIDENT ANALYTICS ================= */}
        {stats?.serviceTypeBreakdown && (
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50] block">Service Type Breakdown</span>
              <h3 className="text-sm font-extrabold text-slate-900 mt-2 mb-4">Most Common Requests</h3>
              <div className="space-y-3">
                {(() => {
                  const total = stats.serviceTypeBreakdown.reduce((acc, curr) => acc + curr.count, 0) || 1
                  return stats.serviceTypeBreakdown.slice(0, 5).map((item) => {
                    const pct = Math.round((item.count / total) * 100)
                    return (
                      <div key={item.service_type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="capitalize text-slate-700">{item.service_type.replace('_', ' ')}</span>
                          <span className="text-slate-950 font-mono text-[11px]">{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-[#FAF6EC] rounded-full overflow-hidden border border-[#E8DFC6]/50">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </Card>

            <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A7A50] block">Status Distribution</span>
              <h3 className="text-sm font-extrabold text-slate-900 mt-2 mb-4">Request Lifecycle</h3>
              <div className="space-y-3">
                {(() => {
                  const total = stats.statusBreakdown.reduce((acc, curr) => acc + curr.count, 0) || 1
                  return stats.statusBreakdown.slice(0, 5).map((item) => {
                    const pct = Math.round((item.count / total) * 100)
                    return (
                      <div key={item.status} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="capitalize text-slate-700">{item.status.replace('_', ' ')}</span>
                          <span className="text-slate-950 font-mono text-[11px]">{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-[#FAF6EC] rounded-full overflow-hidden border border-[#E8DFC6]/50">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </Card>
          </section>
        )}

        {/* ================= ESCALATION GATEWAY ================= */}
        <div className="rounded-2xl border border-[#DCCDA9]/80 bg-[#FAF6EC]/50 overflow-hidden shadow-2xs">
          <button 
            onClick={() => setEscalationExpanded(!escalationExpanded)}
            className="w-full flex items-center justify-between p-4.5 text-left bg-white border-b border-slate-100 focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200/60 shadow-2xs">
                <Radio size={16} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#1E1B15]">Admin Control Parameters</h4>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Expand to manage structural account authority and security access vector promotions.</p>
              </div>
            </div>
            <div className="text-slate-400 pr-1">
              {escalationExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>
          
          {escalationExpanded && (
            <div className="p-5 bg-white/60 animate-in fade-in slide-in-from-top-2 duration-200">
              <AdminEscalation />
            </div>
          )}
        </div>

        {/* ================= IDENTIFIED SESSION FOOTER ================= */}
        {profile?.role === 'admin' && (
          <div className="flex items-center gap-2 rounded-xl border border-[#DCCDA9]/70 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 shadow-2xs">
            <Radio size={14} className="text-emerald-500 animate-pulse" />
            <span>Terminal Connected: Authenticated Session Node — </span>
            <span className="font-bold text-slate-900">{profile?.full_name || 'System Administrator'}</span>
          </div>
        )}

        {hasSearched && (
          <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
              Incident search results for &quot;{searchQuery}&quot;
            </h3>
            {searchLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : searchResults.length === 0 ? (
              <p className="text-xs font-medium text-slate-400 text-center py-6">No matching incidents found.</p>
            ) : (
              <div className="space-y-3">
                {searchResults.map((req) => (
                  <Link key={req.id} href={`/dashboard/admin/requests/${req.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#FAF6EC]/60 p-4 hover:border-slate-200 transition-all">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge label={req.status} variant={req.status} dot />
                        <span className="text-[11px] font-medium text-slate-400">{timeAgo(req.created_at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-900 leading-snug">{req.problem_description}</p>
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" /> {req.incident_address || 'GPS active'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}