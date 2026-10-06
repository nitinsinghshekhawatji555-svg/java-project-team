'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import {
  ShieldCheck, User, Check, X, Mail, Phone,
  Briefcase, MapPin, HelpCircle, Clock, Star
} from 'lucide-react'
import MechanicDetailModal from './MechanicDetailModal'

export default function MechanicsVerificationPage() {
  const [mechanics, setMechanics] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedMechanic, setSelectedMechanic] = useState(null)
  const [documentUrls, setDocumentUrls] = useState({})

  useEffect(() => {
    async function getUrls() {
      if (!selectedMechanic || !selectedMechanic.documents || selectedMechanic.documents.length === 0) return
      const urls = {}
      for (const doc of selectedMechanic.documents) {
        try {
          const res = await fetch('/api/admin/mechanics/document-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filePath: doc.file_url }),
          })
          if (res.ok) {
            const data = await res.json()
            urls[doc.id] = data.signedUrl
          } else {
            console.error('Failed to fetch admin document URL:', await res.text())
          }
        } catch (e) {
          console.error('Error getting URL for document:', e)
        }
      }
      setDocumentUrls(prev => ({ ...prev, ...urls }))
    }
    getUrls()
  }, [selectedMechanic])

  async function loadMechanics() {
    try {
      const response = await fetch('/api/admin/mechanics?status=pending', { cache: 'no-store' })
      const payload = await response.json()
      if (response.ok) {
        const filteredMechanics = (payload.mechanics || []).filter(
          (mech) => mech.user?.role === 'mechanic'
        )
        const uniqueMechanics = Array.from(
          new Map(filteredMechanics.map((mech) => [mech.user_id, mech])).values()
        )
        setMechanics(uniqueMechanics)
      }
    } catch (error) {
      toast.error('Failed to load verification queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    setTimeout(() => { if (mounted) loadMechanics() }, 0)
    return () => { mounted = false }
  }, [])

  const [rejectingMechanic, setRejectingMechanic] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const handleAction = async (mechanicUserId, action, reason = null) => {
    setActionLoading(mechanicUserId)
    let newStatus
    switch (action) {
      case 'approve': newStatus = 'verified'; break
      case 'reject': newStatus = 'rejected'; break
      case 'more_info': newStatus = 'more_info'; break
      default: return
    }

    if (action === 'reject' && (!reason || !reason.trim())) {
      toast.error('A rejection reason is required')
      setActionLoading(null)
      return
    }

    try {
      const response = await fetch('/api/admin/mechanics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicUserId, newStatus, reason: reason?.trim() || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update credentials')
      const actionLabels = { approve: 'verified', reject: 'rejected', more_info: 'flagged for more info' }
      toast.success(`Provider ${actionLabels[action]}`)
      setMechanics((current) => current.filter((m) => m.user_id !== mechanicUserId))
      setRejectingMechanic(null)
      setRejectReason('')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <PageWrapper
      title="Identity Clearances"
      description="Review and approve pending mechanic registrations before they can accept field jobs."
    >
      {/* ── Summary strip ──────────────────────────────────────────────── */}
      {!loading && mechanics.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DDD0A8] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#6B5E3E] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            {mechanics.length} pending review
          </div>
        </div>
      )}

      <div className="space-y-3 pb-12">

        {/* ── Loading state ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner />
          </div>

        /* ── Empty state ──────────────────────────────────────────────── */
        ) : mechanics.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#D8CBA8] bg-white/60 py-20 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F0E0] text-[#8A7240] mb-4 border border-[#E0D5B7]">
              <ShieldCheck size={22} />
            </span>
            <h3 className="text-[14px] font-black text-[#1F1B10]">All clear</h3>
            <p className="mt-1 max-w-xs text-[13px] text-[#8A7A50] leading-relaxed">
              No pending mechanic applications. New submissions will appear here automatically.
            </p>
          </div>

        /* ── Mechanic rows ────────────────────────────────────────────── */
        ) : (
          mechanics.map((mech) => {
            const isActing = actionLoading === mech.user_id
            const isBusy = actionLoading !== null

            return (
              <div
                key={mech.user_id}
                className="group rounded-[18px] border border-[#E0D5B7] bg-white shadow-sm transition-all duration-150 hover:border-[#C9B06A] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                <div className="flex flex-col gap-0 lg:flex-row lg:items-stretch">

                  {/* ── LEFT: Applicant identity ─────────────────────── */}
                  <div className="flex items-start gap-4 px-5 py-5 lg:w-[260px] lg:shrink-0 lg:border-r lg:border-[#F0E8D0]">
                    {/* Avatar initial */}
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5F0E0] text-[14px] font-black text-[#8A6B08] border border-[#E5D9B6]">
                      {(mech.user?.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-black text-[#1F1B10] leading-tight truncate">
                        {mech.user?.full_name || 'New Specialist'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8A7A50] font-medium truncate">
                        {mech.user?.email || '—'}
                      </p>
                      {mech.user?.phone ? (
                        <p className="mt-0.5 text-[11px] text-[#8A7A50] font-medium flex items-center gap-1">
                          <Phone size={10} className="shrink-0" />
                          {mech.user.phone}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-[#C0B490] italic">No phone on file</p>
                      )}
                    </div>
                  </div>

                  {/* ── MIDDLE: Workspace details ─────────────────────── */}
                  <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5">

                    {/* Business */}
                    <div className="min-w-[130px]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-1">Workshop</p>
                      <p className="text-[13px] font-black text-[#1F1B10] leading-tight">
                        {mech.business_name || 'Independent Operator'}
                      </p>
                    </div>

                    {/* Location */}
                    <div className="min-w-[110px]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-1">Base</p>
                      <p className="text-[13px] font-semibold text-[#4A4330] flex items-center gap-1 leading-tight">
                        <MapPin size={11} className="text-[#B0A07A] shrink-0" />
                        {mech.location_label || 'Ghana'}
                      </p>
                    </div>

                    {/* Experience */}
                    <div className="min-w-[80px]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-1">Experience</p>
                      <p className="text-[13px] font-semibold text-[#4A4330] flex items-center gap-1 leading-tight">
                        <Clock size={11} className="text-[#B0A07A] shrink-0" />
                        {mech.years_experience ? `${mech.years_experience} yr${mech.years_experience !== 1 ? 's' : ''}` : '—'}
                      </p>
                    </div>

                    {/* Specializations */}
                    {mech.specializations?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-1">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {mech.specializations.slice(0, 3).map((spec) => (
                            <span
                              key={spec}
                              className="rounded-full border border-[#E0D5B7] bg-[#F8F3E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B5E3E] capitalize"
                            >
                              {spec}
                            </span>
                          ))}
                          {mech.specializations.length > 3 && (
                            <span className="rounded-full border border-[#E0D5B7] bg-[#F8F3E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#B0A07A]">
                              +{mech.specializations.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── RIGHT: Action buttons ─────────────────────────── */}
                  <div className="flex items-center gap-2 border-t border-[#F0E8D0] px-5 py-4 lg:border-l lg:border-t-0 lg:px-5 lg:py-0 lg:w-[260px] lg:shrink-0">
                    {/* Authorize — primary */}
                    <button
                      disabled={isBusy}
                      onClick={() => handleAction(mech.user_id, 'approve')}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1A1609] px-4 text-[12px] font-black tracking-wide text-white transition-all hover:bg-[#2C2410] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isActing ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Check size={13} strokeWidth={2.5} />
                      )}
                      Authorize
                    </button>

                    {/* More info — secondary */}
                    <button
                      disabled={isBusy}
                      onClick={() => setSelectedMechanic(mech)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5D0A0] bg-[#FBF6E8] text-[#8A6B08] transition hover:bg-[#F5EDD0] disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Review application credentials"
                    >
                      <HelpCircle size={14} strokeWidth={2} />
                    </button>

                    {/* Deny — ghost destructive */}
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        setRejectingMechanic(mech)
                        setRejectReason('')
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDCDC] bg-white text-[#C07070] transition hover:bg-[#FFF0F0] hover:border-[#DDAAAA] hover:text-[#A04040] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Deny application"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>

                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Reject Justification Modal */}
      {rejectingMechanic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E0D5B7] space-y-4">
            <div>
              <h3 className="text-lg font-black text-[#1F1B10]">Reject Mechanic Application</h3>
              <p className="text-xs text-[#8A7A50] mt-1">
                Provide a recorded justification reason for rejecting <strong>{rejectingMechanic.user?.full_name || 'this provider'}</strong>. This will be permanently written to the audit log.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B5E3E] mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Fraudulent certification document or failed background check..."
                rows={3}
                className="w-full rounded-xl border border-[#DDD0A8] p-3 text-xs text-[#1F1B10] focus:border-[#8A6B08] focus:outline-none focus:ring-1 focus:ring-[#8A6B08]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingMechanic(null)
                  setRejectReason('')
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || actionLoading === rejectingMechanic.user_id}
                onClick={() => handleAction(rejectingMechanic.user_id, 'reject', rejectReason)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40 cursor-pointer"
              >
                {actionLoading === rejectingMechanic.user_id ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <X size={13} strokeWidth={2.5} />
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <MechanicDetailModal
        isOpen={!!selectedMechanic}
        onClose={() => setSelectedMechanic(null)}
        mechanic={selectedMechanic}
        documentUrls={documentUrls}
        onAuthorize={async (id) => {
          await handleAction(id, 'approve')
          setSelectedMechanic(null)
        }}
        onRequestMoreInfo={async (id) => {
          await handleAction(id, 'more_info')
          setSelectedMechanic(null)
        }}
        actionLoading={actionLoading === selectedMechanic?.user_id}
      />
    </PageWrapper>
  )
}