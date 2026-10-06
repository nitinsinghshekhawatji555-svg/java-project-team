'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { timeAgo } from '@/lib/utils'
import { ArrowLeft, MapPin, User, HardHat, Calendar, Info, ShieldAlert, CheckCircle, Star, AlertTriangle } from 'lucide-react'
import dynamic from 'next/dynamic'



export default function AdminRequestDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    if (!id) return

    async function loadRequestDetails() {
      try {
        const response = await fetch(`/api/requests/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch request details')
        }

        setRequest(data.request)
      } catch (err) {
        console.error('Error loading request detail:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadRequestDetails()
  }, [id])

  async function handleAdminCancel() {
    const reason = prompt('Please enter an administrative cancellation reason (optional):')
    if (reason === null) return // User cancelled the prompt

    setCanceling(true)
    try {
      const response = await fetch(`/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'cancelled', 
          reason: reason.trim() || 'Administrative cancellation' 
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel request')
      }

      alert('Request has been administratively cancelled.')
      router.refresh()
      
      // Reload request details
      const detailsRes = await fetch(`/api/requests/${id}`)
      const detailsData = await detailsRes.json()
      if (detailsRes.ok) {
        setRequest(detailsData.request)
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Request details" description="Loading incident parameters...">
        <div className="h-[50vh] flex items-center justify-center">
          <Spinner />
        </div>
      </PageWrapper>
    )
  }

  if (error || !request) {
    return (
      <PageWrapper title="Request details" description="Incident error feed.">
        <Card className="p-6 max-w-xl mx-auto border-red-200 bg-red-50/50">
          <div className="flex items-start gap-3 text-red-700">
            <ShieldAlert className="shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Failed to load incident</h3>
              <p className="text-xs mt-1 text-red-600">{error || 'Incident details not found.'}</p>
              <Link href="/dashboard/admin/requests" className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-slate-700 underline">
                Back to Incident Log
              </Link>
            </div>
          </div>
        </Card>
      </PageWrapper>
    )
  }

  const driver = request.driver
  const mechanic = request.assignedMechanic
  const isCancellationAllowed = ['pending', 'accepted'].includes(request.status)

  const workflowStages = [
    { key: 'pending', label: 'Requested' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'en_route', label: 'En Route' },
    { key: 'arrived', label: 'On Site' },
    { key: 'in_progress', label: 'Working' },
    { key: 'completed', label: 'Completed' },
  ]

  const currentStageIndex = workflowStages.findIndex(s => s.key === request.status)

  return (
    <PageWrapper
      title={`Incident Details #${id.slice(0, 8)}`}
      description="Administrative monitoring and operations control panel."
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
        {/* Back Link */}
        <div className="flex items-center">
          <Link
            href="/dashboard/admin/requests"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Incident Log
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main info panel */}
          <div className="lg:col-span-2 space-y-6">


            {/* Incident Details Card */}
            <Card className="p-5 border-[#DCCDA9]/70 bg-white shadow-sm">
              <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7A50]">Service Category</span>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5 uppercase tracking-tight">{request.serviceType?.replace('_', ' ') || 'Assistance'}</h2>
                </div>
                <Badge label={request.status} variant={request.status} dot />
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7A50]">Problem Description</span>
                  <p className="text-sm font-medium text-slate-800 mt-1 leading-relaxed">{request.issue || 'No problem description specified.'}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7A50]">Location Address</span>
                    <p className="text-xs font-bold text-slate-700 mt-1 flex items-start gap-1.5">
                      <MapPin size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{request.location || 'Accra, Ghana'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7A50]">Reported Timeline</span>
                    <p className="text-xs font-bold text-slate-700 mt-1 flex items-start gap-1.5">
                      <Calendar size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{timeAgo(request.createdAt)} ({new Date(request.createdAt).toLocaleString()})</span>
                    </p>
                  </div>
                </div>

                {request.status === 'cancelled' && (
                  <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">Cancellation Metadata</span>
                    <p className="text-xs font-bold text-red-900 mt-0.5">Reason: {request.cancellation_reason || 'No cancellation reason logged.'}</p>
                    <p className="text-[10px] text-red-600 mt-0.5">Cancelled at: {request.cancelled_at ? new Date(request.cancelled_at).toLocaleString() : 'N/A'}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quality & Feedback Section */}
            {(request.rating || request.review || (request.reports && request.reports.length > 0)) ? (
              <Card className="p-5 border-[#DCCDA9]/70 bg-white shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Quality & Feedback</h3>
                </div>

                {/* Star Rating and Written Feedback */}
                {(request.rating || request.review) && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7A50] block">Driver Review Summary</span>
                    <div className="rounded-xl border border-slate-100 bg-[#FAF6EC]/60 p-3.5 space-y-2">
                      {request.rating && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={13}
                                className={i < request.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-700">({request.rating}.0 / 5.0 Rating)</span>
                        </div>
                      )}
                      {request.review && (
                        <p className="text-xs italic text-slate-600 font-medium leading-relaxed">
                          &quot;{request.review}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Driver-to-Mechanic and Mechanic-to-Driver report/flag status */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7A50] block">Safety & Conduct Flags</span>
                  <div className="rounded-xl border border-slate-100 bg-[#FAF6EC]/60 p-3.5 space-y-2.5">
                    {request.reports && request.reports.length > 0 ? (
                      request.reports.map((rep) => {
                        const reporterRole = rep.reporter_id === request.driver_id ? 'Driver' : 'Mechanic'
                        const targetRole = reporterRole === 'Driver' ? 'Mechanic' : 'Driver'
                        
                        // Humanize reason codes
                        const reasonLabel = rep.reason_header === 'inappropriate_behavior' ? 'Inappropriate Behavior'
                          : rep.reason_header === 'pricing_issue' ? 'Pricing/Payment Dispute'
                          : rep.reason_header === 'delay' ? 'Excessive Delay'
                          : rep.reason_header || 'Reported Incident'

                        return (
                          <div key={rep.id} className="text-xs border-l-2 border-red-500 pl-3 py-0.5 space-y-0.5">
                            <p className="font-bold text-red-700 flex items-center gap-1.5">
                              <AlertTriangle size={13} className="text-red-600 shrink-0" />
                              <span>{reporterRole}-to-{targetRole} Report Filed: {reasonLabel}</span>
                            </p>
                            <p className="text-slate-600 font-medium leading-relaxed">
                              Comment: &quot;{rep.comment}&quot;
                            </p>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                        <CheckCircle className="text-emerald-500 h-4 w-4" /> No flags logged
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-5 border-[#DCCDA9]/70 bg-white shadow-sm">
                <div className="border-b border-slate-100 pb-3 mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Quality & Feedback</h3>
                </div>
                <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="text-emerald-500 h-4 w-4" /> No ratings or incident flags logged for this request.
                </p>
              </Card>
            )}

            {/* Workflow Pipeline Tracker */}
            {request.status !== 'cancelled' && (
              <Card className="p-5 border-[#DCCDA9]/70 bg-white shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7A50] block mb-3.5">Operations Lifecycle Progress</span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {workflowStages.map((stage, idx) => {
                    const isPast = idx < currentStageIndex
                    const isCurrent = idx === currentStageIndex
                    return (
                      <div
                        key={stage.key}
                        className={`rounded-xl p-2.5 border text-center transition-all ${
                          isCurrent
                            ? 'border-primary bg-primary/20 ring-1 ring-primary/40 font-bold'
                            : isPast
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                              : 'border-slate-100 bg-[#FAF6EC]/40 opacity-50'
                        }`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-tight ${isCurrent ? 'text-slate-950' : isPast ? 'text-emerald-800' : 'text-slate-400'}`}>
                          {stage.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar panel */}
          <div className="space-y-5">
            {/* Driver Profile */}
            <Card className="p-5 border-[#DCCDA9]/70 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3 text-slate-500">
                <User size={14} className="text-slate-800" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">Driver Account Details</span>
              </div>
              {driver ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-[#8A7A50] uppercase font-bold">Full Name</span>
                    <p className="text-sm font-black text-slate-900">{driver.full_name || 'Anonymous'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A7A50] uppercase font-bold">Contact Phone</span>
                    <p className="text-xs font-bold text-slate-800 font-mono">{driver.phone || 'No phone registered'}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[9px] text-[#8A7A50] uppercase font-bold block">Vehicle Info</span>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{request.vehicleDetails || 'No vehicle data'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Driver details unavailable.</p>
              )}
            </Card>

            {/* Mechanic Profile */}
            <Card className="p-5 border-[#DCCDA9]/70 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3 text-slate-500">
                <HardHat size={14} className="text-slate-800" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">Assigned Mechanic</span>
              </div>
              {mechanic ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-[#8A7A50] uppercase font-bold">Full Name</span>
                    <p className="text-sm font-black text-slate-900">{mechanic.full_name || 'Independent Specialist'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A7A50] uppercase font-bold">Contact Phone</span>
                    <p className="text-xs font-bold text-slate-800 font-mono">{mechanic.phone || 'No contact number'}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[9px] text-[#8A7A50] uppercase font-bold block">Garage Workshop</span>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{mechanic.mechanic_profiles?.business_name || 'Mobile Operator'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{mechanic.mechanic_profiles?.location_label || 'Ghana grid network'}</p>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-xs text-slate-400">No mechanic assigned to this dispatch ticket yet.</p>
                </div>
              )}
            </Card>

            {/* Admin Control Panel */}
            <Card className="p-5 border-[#DCCDA9]/70 bg-white shadow-sm border-l-4 border-l-red-500">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                <Info size={14} className="text-red-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">Operations Control</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Administrators can override request states in cases of dispatch failure, duplicate creation, or communication dropouts.
              </p>

              {isCancellationAllowed ? (
                <button
                  type="button"
                  onClick={handleAdminCancel}
                  disabled={canceling}
                  className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-black uppercase tracking-wider text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {canceling ? 'Cancelling ticket...' : 'Cancel Request'}
                </button>
              ) : (
                <div className="p-3 bg-[#FAF6EC] rounded-xl border border-[#E8DFC6] text-center">
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Cancellation Locked</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    {request.status === 'cancelled'
                      ? 'Incident is already cancelled.'
                      : request.status === 'completed'
                        ? 'Incident has been completed.'
                        : 'Cannot cancel once mechanic is en route or working.'}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
