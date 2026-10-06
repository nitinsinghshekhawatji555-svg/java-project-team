'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { updatePassword } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import { Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)

  useEffect(() => {
    async function checkRecoverySession() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        // Check if there is an active session (set automatically by Supabase Auth upon clicking recovery link)
        if (session) {
          setHasValidSession(true)
        } else {
          // Listen for auth state change in case the hash/token is still resolving
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            if (event === 'PASSWORD_RECOVERY' || (s && event === 'SIGNED_IN')) {
              setHasValidSession(true)
            }
          })
          return () => subscription.unsubscribe()
        }
      } catch (err) {
        console.warn('Session evaluation error:', err)
      } finally {
        setCheckingSession(false)
      }
    }

    checkRecoverySession()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match. Please ensure both fields match.')
      return
    }

    try {
      setLoading(true)
      await updatePassword(newPassword)
      setSuccess(true)
      toast.success('Your password has been reset successfully!')
    } catch (err) {
      console.error('[PASSWORD UPDATE ERROR]:', err)
      toast.error(err?.message || 'Failed to update password. Your recovery link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm">
          <CheckCircle2 size={32} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-950">Password Updated</h3>
          <p className="text-xs leading-relaxed text-[#6E634B]">
            Your password has been changed securely. You can now use your new password to sign into your RoadRescue account.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => router.replace('/auth/login')}
          className="w-full h-[50px] rounded-[12px] bg-[#1A1609] text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-[#2A2211] hover:-translate-y-[1px] active:translate-y-0 flex items-center justify-center gap-2"
        >
          Sign In Now <ArrowRight size={14} />
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
          New Secure Password
        </label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full h-[48px] rounded-[12px] border-[#DDD0A8] bg-[#FFFBF4] text-[#1F1B10] placeholder-[#B8A880] focus:border-[#1A1609] focus:ring-[#1A1609] pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[#6E634B]">
          Must be at least 6 characters long.
        </p>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
          Confirm New Password
        </label>
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full h-[48px] rounded-[12px] border-[#DDD0A8] bg-[#FFFBF4] text-[#1F1B10] placeholder-[#B8A880] focus:border-[#1A1609] focus:ring-[#1A1609]"
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="mt-1.5 text-[11px] font-bold text-rose-600 flex items-center gap-1">
            <AlertTriangle size={12} className="shrink-0" /> Passwords do not match.
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-[50px] rounded-[12px] bg-[#1A1609] text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-[#2A2211] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50"
        disabled={loading || (confirmPassword.length > 0 && newPassword !== confirmPassword)}
      >
        {loading ? 'Updating Password...' : 'Save New Password'}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/auth/login"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Cancel and return to Login
        </Link>
      </div>
    </form>
  )
}
