'use client'

import { useEffect, useState } from 'react'

import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { ShieldAlert, Check, X, FileText, ArrowRight, User2 } from 'lucide-react'

export default function AdminReviewsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  async function loadRequests() {
    try {
      const response = await fetch('/api/admin/profile-change-requests?status=pending', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to load review queue')
      setRequests(payload.requests || [])
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRequests()
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  const review = async (requestId, action) => {
    setActionLoading(requestId)
    try {
      const response = await fetch('/api/admin/profile-change-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId, 
          action, 
          reviewNotes: action === 'approved' ? 'Approved by admin review panel' : 'Rejected by admin review panel' 
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update request')
      toast.success(`Request successfully ${action}`)
      await loadRequests()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Format database keys into friendly dashboard parameters
  const formatLabel = (str) => {
    if (!str) return 'Parameter Change'
    return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Beautiful render block for rendering values cleanly instead of raw JSON dumps
  const renderValueBlock = (val) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-400 italic">Unset</span>
    if (Array.isArray(val)) return val.join(', ')
    if (typeof val === 'object') {
      return (
        <div className="space-y-1 text-xs">
          {Object.entries(val).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="font-bold text-slate-500">{formatLabel(k)}:</span>
              <span className="text-slate-800 font-medium">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
            </div>
          ))}
        </div>
      )
    }
    return String(val)
  }

  return (
    <PageWrapper 
      title="Data Clearances" 
      description="Moderate pending credential corrections, workplace field modifications, and structural profile parameter shifts."
    >
      <div className="mx-auto max-w-4xl space-y-5 pb-12">
        {loading ? (
          <Card className="rounded-2xl border-slate-200 bg-white py-16 flex justify-center shadow-sm">
            <Spinner />
          </Card>
        ) : requests.length === 0 ? (
          /* Premium design placeholder empty-state setup */
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 py-16 px-4 text-center max-w-md mx-auto mt-12">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3.5 border border-slate-200/60 shadow-sm">
              <ShieldAlert size={20} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Queue Completely Cleared</h3>
            <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400 font-medium leading-relaxed">
              There are no pending identity profile edits or registration criteria adjustments requiring administrative moderation at the moment.
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 transition-all">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                
                {/* LEFT CONTEXT MODULE */}
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={request.status} variant={request.status} dot />
                    <Badge label={request.role} variant={request.role} />
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/40">
                      <User2 size={12} className="text-slate-400" />
                      {request.user?.full_name || 'Account ID: ' + request.user_id}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <FileText size={14} /> Update Vector:
                      <span className="text-slate-800 lowercase ml-1 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {request.target_table === 'mechanic_profiles' ? 'Mechanic Data' : 'Driver Data'} ({formatLabel(request.field_key)})
                      </span>
                    </h3>
                    <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed bg-amber-50/40 border border-amber-100/60 rounded-xl p-3">
                      <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] block mb-0.5">Stated Review Justification</span>
                      &#34;{request.reason || 'No structural reason provided by account node.'}
                    </p>
                  </div>

                  {/* HIGH CONTRAST DELTA BOX PLOT */}
                  <div className="grid gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm sm:grid-cols-2 relative">
                    <div className="space-y-1 bg-white border border-slate-200/60 rounded-xl p-3.5 shadow-xs">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-1">
                        <X size={12} strokeWidth={3} /> Deprecated Entry
                      </p>
                      <div className="mt-2 text-xs text-slate-600 font-medium leading-relaxed overflow-x-auto">
                        {renderValueBlock(request.old_value)}
                      </div>
                    </div>
                    
                    <div className="space-y-1 bg-white border border-emerald-200/60 rounded-xl p-3.5 shadow-xs">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                        <Check size={12} strokeWidth={3} /> Proposed Configuration
                      </p>
                      <div className="mt-2 text-xs text-slate-800 font-bold leading-relaxed overflow-x-auto">
                        {renderValueBlock(request.new_value)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT CONTROL BUTTON ACTION NODE */}
                <div className="flex gap-2 sm:justify-end lg:flex-col lg:justify-start shrink-0 pt-1">
                  <Button 
                    variant="primary" 
                    loading={actionLoading === request.id} 
                    onClick={() => review(request.id, 'approved')} 
                    className="flex-1 lg:w-36 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs h-10 shadow-sm"
                  >
                    Approve Delta
                  </Button>
                  <Button 
                    variant="outline" 
                    loading={actionLoading === request.id} 
                    onClick={() => review(request.id, 'rejected')} 
                    className="flex-1 lg:w-36 border-red-200 hover:bg-red-50 text-red-600 rounded-xl font-bold uppercase tracking-wider text-xs h-10 bg-white"
                  >
                    Reject Change
                  </Button>
                </div>

              </div>
            </Card>
          ))
        )}
      </div>
    </PageWrapper>
  )
}