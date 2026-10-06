'use client'

import Link from 'next/link'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-amber-800">
          Security Update
        </span>
        <h1 className="text-3xl font-black text-slate-950">Set New Password</h1>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Choose a strong password to protect your RoadRescue account.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  )
}
