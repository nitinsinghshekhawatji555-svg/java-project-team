import { Suspense } from 'react'
import Link from 'next/link'

import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-amber-800">
          RoadRescue
        </span>
        <h1 className="text-3xl font-black text-slate-950">Join Our Network</h1>
        <p className="text-sm text-slate-500">Create an account for secure operations.</p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-slate-50 rounded-xl" />}>
        <RegisterForm />
      </Suspense>

      <p className="text-center text-sm text-slate-500">
        Already have an account? <Link href="/auth/login" className="font-bold text-amber-600">Login</Link>
      </p>
    </div>
  )
}