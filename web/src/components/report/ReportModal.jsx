'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

const REASON_OPTIONS = [
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'pricing_issue', label: 'Pricing issue' },
  { value: 'delay', label: 'Delay' },
  { value: 'other', label: 'Other' },
]

export default function ReportModal({ isOpen, onClose, requestId, reporterId }) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleClose = () => {
    if (submitting) return
    setReason('')
    setComment('')
    setSubmitted(false)
    onClose()
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!reason || !comment.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          reporterId,
          reasonHeader: reason,
          comment: comment.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit report')
      }

      setSubmitted(true)
      toast.success('Report submitted successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Report Incident"
      size="sm"
      actions={
        submitted ? (
          <Button onClick={handleClose} className="w-full">
            Dismiss
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={submitting}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleSubmit}
              disabled={!reason || !comment.trim()}
              loading={submitting}
              className="text-xs font-bold uppercase tracking-wider px-4"
            >
              Submit Report
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="py-4 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="text-sm font-bold text-gray-900">Incident Reported Successfully</h4>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            Thank you for your report. Our dispatch team will review the details and take corrective measures.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#FFF9EF] border border-[#E8DCC0] p-3 text-xs text-[#6C5E3B] font-medium leading-relaxed">
            Submit incident reports for delayed dispatch, incorrect charges, or misconduct.
          </div>

          <Select
            label="Reason"
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={[{ value: '', label: 'Select a reason…' }, ...REASON_OPTIONS]}
          />

          <div>
            <Textarea
              label="Details"
              id="report-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what happened in as much detail as possible…"
              rows={4}
              maxLength={500}
            />
            <p className="text-[11px] text-gray-400 text-right mt-1">
              {comment.length} / 500 chars
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}