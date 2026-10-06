'use client'

import Modal from '@/components/ui/Modal'
import {
  User, Mail, Phone, Briefcase, MapPin, Clock,
  Wrench, FileText, ExternalLink, ShieldCheck, HelpCircle, X
} from 'lucide-react'

export default function MechanicDetailModal({
  isOpen,
  onClose,
  mechanic,
  documentUrls,
  onAuthorize,
  onRequestMoreInfo,
  actionLoading
}) {
  if (!mechanic) return null

  const specList = mechanic.specializations || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Application"
      size="md"
      actions={
        <>
          <button
            disabled={actionLoading}
            onClick={onClose}
            className="w-full sm:w-auto inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-black uppercase tracking-wider text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>

          <button
            disabled={actionLoading}
            onClick={() => onRequestMoreInfo(mechanic.user_id)}
            className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E5D0A0] bg-[#FBF6E8] px-5 text-xs font-black uppercase tracking-wider text-[#8A6B08] hover:bg-[#F5EDD0] disabled:opacity-40 cursor-pointer"
          >
            {actionLoading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#8A6B08]/30 border-t-[#8A6B08]" />
            ) : (
              <HelpCircle size={13} />
            )}
            Request More Info
          </button>

          <button
            disabled={actionLoading}
            onClick={() => onAuthorize(mechanic.user_id)}
            className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1A1609] px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#2C2410] disabled:opacity-40 cursor-pointer"
          >
            {actionLoading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <CheckCircle />
            )}
            Authorize
          </button>
        </>
      }
    >
      <div className="space-y-6">
        
        {/* Profile Card Header */}
        <div className="flex items-start gap-4 rounded-2xl bg-[#F8F3E6] border border-[#E5D9B6] p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-[20px] font-black text-[#8A6B08] border border-[#E5D9B6]">
            {(mechanic.user?.full_name || 'U').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h4 className="text-[17px] font-black text-[#1F1B10] leading-snug">
              {mechanic.user?.full_name || 'New Specialist'}
            </h4>
            <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-xs text-[#8A7A50]">
              <span className="flex items-center gap-1">
                <Mail size={12} />
                {mechanic.user?.email || '—'}
              </span>
              {mechanic.user?.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} />
                  {mechanic.user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          
          <div className="rounded-xl border border-[#E0D5B7] p-3.5 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-1">Workshop Name</p>
            <p className="text-[13px] font-black text-[#1F1B10] flex items-center gap-1.5">
              <Briefcase size={14} className="text-[#B0A07A]" />
              {mechanic.business_name || 'Independent Operator'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E0D5B7] p-3.5 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-1">Primary Base Area</p>
            <p className="text-[13px] font-semibold text-[#4A4330] flex items-center gap-1.5">
              <MapPin size={14} className="text-[#B0A07A]" />
              {mechanic.location_label || 'Ghana'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E0D5B7] p-3.5 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-1">Experience Depth</p>
            <p className="text-[13px] font-semibold text-[#4A4330] flex items-center gap-1.5">
              <Clock size={14} className="text-[#B0A07A]" />
              {mechanic.years_experience ? `${mechanic.years_experience} Years Vetted Professional` : 'Not documented'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E0D5B7] p-3.5 bg-white sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0A07A] mb-2">Skills & Specializations</p>
            {specList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {specList.map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full border border-[#E0D5B7] bg-[#F8F3E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B5E3E] capitalize"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#C0B490] italic">No skills listed</p>
            )}
          </div>

        </div>

        {/* Verification Documents Section */}
        <div className="space-y-2.5">
          <h5 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1F1B10] border-b border-[#F0E8D0] pb-1.5">
            Verification Documents
          </h5>

          {mechanic.documents && mechanic.documents.length > 0 ? (
            <div className="space-y-2">
              {mechanic.documents.map((doc) => {
                const docUrl = documentUrls?.[doc.id]
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-[#E0D5B7] bg-white p-3 hover:border-[#C9B06A] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F3E6] text-[#8A7A50]">
                        <FileText size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#1F1B10] truncate">
                          {doc.document_name || 'Verification Document'}
                        </p>
                        <p className="text-[10px] text-[#8A7A50] font-medium mt-0.5">
                          Uploaded {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>

                    {docUrl ? (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5D0A0] bg-[#FBF6E8] px-3 text-xs font-bold text-[#8A6B08] hover:bg-[#F5EDD0] transition-all"
                      >
                        View <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#C0B490] italic">Resolving link...</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D8CBA8] bg-[#FDFBF7] py-6 text-center">
              <span className="text-[#B0A07A] mb-1">
                <FileText size={20} />
              </span>
              <p className="text-xs text-[#8A7A50] font-semibold">No clearance documents uploaded yet</p>
            </div>
          )}
        </div>

      </div>
    </Modal>
  )
}

function CheckCircle() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
