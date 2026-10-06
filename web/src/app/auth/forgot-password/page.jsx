'use client'

import Link from 'next/link'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-amber-800">
          Account Security
        </span>
        <h1 className="text-3xl font-black text-slate-950">Reset Password</h1>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Recover access to your RoadRescue account via email verification.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-slate-500">
        Remember your credentials?{' '}
        <Link href="/auth/login" className="font-bold text-amber-600 hover:text-amber-700 underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
