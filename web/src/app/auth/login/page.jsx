"use client"

import Link from 'next/link'
import { Smartphone } from 'lucide-react'

import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-amber-800">
          RoadRescue
        </span>
        <h1 className="text-3xl font-black text-slate-950">Welcome Back</h1>
        <p className="text-sm text-slate-500">Sign in to continue.</p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-slate-500">
        Don’t have an account? <Link href="/auth/register" className="font-bold text-amber-600">Register</Link>
      </p>

      <div className="pt-4 text-center lg:hidden">
        <Link 
          href="/install" 
          className="inline-flex items-center gap-1.5 rounded-full border border-[#DCCDA9] bg-[#FFF9EF] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#7C6B44] transition-all hover:bg-[#F5EDD0] shadow-xs"
        >
          <Smartphone size={14} className="text-[#7C6B44]" />
          <span>Use as an App(PWA)</span>
        </Link>
      </div>
    </div>
  )
}