'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { resetPasswordForEmail } from '@/lib/auth'
import { Mail, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  async function handleSubmit(e) {
    if (e) e.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      toast.error('Please enter your account email address.')
      return
    }

    try {
      setLoading(true)
      await resetPasswordForEmail(trimmedEmail)
      setSubmitted(true)
      setResendCooldown(60)
      toast.success('Recovery instructions sent to your email!')

      // Start countdown for resend
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      console.error('[PASSWORD RECOVERY ERROR]:', err)
      toast.error(err?.message || 'Failed to send recovery instructions. Please check your email and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm">
          <CheckCircle2 size={32} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-950">Check Your Inbox</h3>
          <p className="text-xs leading-relaxed text-[#6E634B]">
            We have sent password recovery instructions to <strong className="text-slate-900 font-semibold">{email}</strong>. Follow the link in the email to set a new password.
          </p>
        </div>

        <div className="rounded-xl border border-[#DDD0A8]/80 bg-[#FFFBF4] p-4 text-left">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Didn't receive an email?</p>
          <p className="mt-1 text-xs text-[#7A6B46]">
            Check your spam/junk folder. Recovery links typically arrive within 1–2 minutes.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || resendCooldown > 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#DDD0A8] bg-white text-xs font-bold uppercase tracking-wider text-slate-800 shadow-xs hover:bg-[#FFFBF4] transition-all disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
            {resendCooldown > 0 ? `Resend Email (${resendCooldown}s)` : 'Resend Recovery Email'}
          </button>

          <Link
            href="/auth/login"
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1A1609] text-xs font-black uppercase tracking-wider text-white hover:bg-[#2A2211] transition-all active:scale-[0.99]"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
          Account Email Address
        </label>
        <div className="relative">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-[48px] rounded-[12px] border-[#DDD0A8] bg-[#FFFBF4] text-[#1F1B10] placeholder-[#B8A880] focus:border-[#1A1609] focus:ring-[#1A1609]"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[#6E634B]">
          Enter the email address registered with your account.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full h-[50px] rounded-[12px] bg-[#1A1609] text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-[#2A2211] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Sending Instructions...' : 'Send Recovery Instructions'}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </form>
  )
}
