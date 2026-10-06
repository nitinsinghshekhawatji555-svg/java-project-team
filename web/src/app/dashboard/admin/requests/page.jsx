'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { timeAgo } from '@/lib/utils'
import { Radar, MapPin, User, HardHat, FileText, ArrowRight } from 'lucide-react'



export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadRequests() {
      if (mounted) setLoading(true)
      const url = filter === 'all'
        ? '/api/admin/requests'
        : `/api/admin/requests?status=${filter}`

      const response = await fetch(url, { cache: 'no-store' })
      const payload = await response.json()

      if (response.ok && mounted) {
        setRequests(payload.requests || [])
      }
      if (mounted) setLoading(false)
    }

    loadRequests()
    return () => {
      mounted = false
    }
  }, [filter])

  // Grouped status categorization structure
  const CATEGORIES = [
    { id: 'all', label: 'All Incidents', filters: ['all'] },
    { id: 'active', label: 'Active Pipeline', filters: ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'] },
    { id: 'resolved', label: 'Resolved / Cancelled', filters: ['completed', 'cancelled'] },
    { id: 'flagged', label: 'Flagged', filters: ['flagged'] },
  ]

  const activeCategory = CATEGORIES.find(cat => cat.filters.includes(filter)) || CATEGORIES[0]

  const getSubFilterLabel = (status) => {
    switch (status) {
      case 'all': return 'All Records'
      case 'pending': return 'Pending Dispatch'
      case 'accepted': return 'Accepted'
      case 'en_route': return 'En Route'
      case 'arrived': return 'On Site'
      case 'in_progress': return 'In Progress'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      case 'flagged': return 'Flagged Only'
      default: return status.replace('_', ' ')
    }
  }

  return (
    <PageWrapper 
      title="Global Incident Log" 
      description="Monitor dispatch operations, track rescue lifecycle stages, and audit incident records across regions."
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
        
        {/* ================= MODERN 2-TIER SEGMENTED FILTER BAR ================= */}
        <div className="rounded-2xl border border-[#DCCDA9]/80 bg-white p-4 shadow-sm space-y-3.5">
          {/* Tier 1: High-level Lifecycle Categories */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#FAF6EC] border border-[#E8DFC6]/70">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory.id === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (cat.filters.length === 1) {
                      setFilter(cat.filters[0])
                    } else if (!cat.filters.includes(filter)) {
                      setFilter(cat.filters[0])
                    }
                  }}
                  className={`flex-1 min-w-[130px] rounded-lg px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-[#6A6046] hover:text-[#1E1B15] hover:bg-white/60'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Tier 2: Granular Stage Filters (Shown when category has multiple statuses) */}
          {activeCategory.filters.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Stage:</span>
              {activeCategory.filters.map((st) => {
                const isCurrent = filter === st
                return (
                  <button
                    key={st}
                    onClick={() => setFilter(st)}
                    className={`rounded-lg border px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer ${
                      isCurrent
                        ? 'bg-primary text-slate-950 border-primary shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {getSubFilterLabel(st)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ================= PRIMARY INCIDENTS LOG CONTAINER FEED ================= */}
        <div className="w-full space-y-3">
          {loading ? (
            <Card className="rounded-2xl border-[#DCCDA9]/70 bg-white py-20 flex justify-center shadow-sm">
              <Spinner />
            </Card>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DCCDA9] bg-white/70 py-16 px-4 text-center max-w-md mx-auto mt-6">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF6EC] text-slate-400 mb-3.5 border border-[#E8DFC6] shadow-2xs">
                <Radar size={20} className="text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Incidents Documented</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 font-medium leading-relaxed">
                There are currently no roadside breakdown tickets active under the selected status configuration criteria.
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="rounded-2xl border-[#DCCDA9]/70 bg-white p-4.5 shadow-sm hover:border-[#CDBD97] hover:shadow-md transition-all group">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={request.status} variant={request.status} dot />
                      <Badge label={request.service_type || 'Rescue Order'} variant="default" />
                      <span className="text-[11px] font-medium text-slate-400">{timeAgo(request.created_at)}</span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight capitalize leading-snug">
                        {request.problem_description || 'Roadside Assistance Request'}
                      </h4>
                      <p className="mt-1 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{request.incident_address || 'GPS Coordinates Pending'}</span>
                      </p>
                    </div>

                    {/* Meta User Identity Badges */}
                    <div className="pt-2 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-100 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] tracking-wider text-slate-400 uppercase font-black">Driver:</span>
                        <span className="text-slate-800 font-medium truncate">{request.driver?.full_name || 'Anonymous User'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <HardHat size={13} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] tracking-wider text-slate-400 uppercase font-black">Mechanic:</span>
                        <span className={`truncate ${request.mechanic?.full_name ? 'text-slate-800 font-medium' : 'text-amber-700 italic font-medium'}`}>
                          {request.mechanic?.full_name || 'Awaiting Allocation'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Interaction Anchor Button */}
                  <Link 
                    href={`/dashboard/admin/requests/${request.id}`}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#FAF6EC] hover:bg-white hover:border-slate-300 px-4 text-xs font-black uppercase tracking-wider text-slate-800 shadow-2xs transition-all self-start lg:self-center w-full lg:w-auto cursor-pointer"
                  >
                    <FileText size={14} className="text-slate-500" />
                    <span>Open Record</span>
                    <ArrowRight size={13} className="transform group-hover:translate-x-0.5 transition-transform text-slate-400" />
                  </Link>

                </div>
              </Card>
            ))
          )}
        </div>

      </div>
    </PageWrapper>
  )
}