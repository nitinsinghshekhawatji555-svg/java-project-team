'use client'

import Link from 'next/link'
import { ArrowLeft, Home, Search, MapPin, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const roleRoutes = {
  driver: '/dashboard/driver',
  mechanic: '/dashboard/mechanic',
  admin: '/dashboard/admin',
}

export default function RoleAwareNotFound() {
  const { role } = useAuth()
  const dashboardHref = roleRoutes[role] || '/auth/login'
  const dashboardLabel = role
    ? `Go to ${role.charAt(0).toUpperCase()}${role.slice(1)} Dashboard`
    : 'Sign In'

  return (
    <div className="min-h-screen w-full bg-[#FFF8EA] text-[#1F1B10] lg:grid lg:grid-cols-2 antialiased">

      {/* ===== LEFT: Dark hero panel (Centered) ===== */}
      <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden bg-[#1A1609] px-8 py-16 text-white lg:min-h-screen lg:px-16 lg:py-20">

        {/* Ambient layers */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,209,8,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#1A1609_0%,#231D0B_55%,#161209_100%)]" />
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Centered Content Wrapper */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
          
          {/* Brand pill */}
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-white/60 backdrop-blur-sm shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            RoadRescue
          </div>

          {/* Pulsing pin motif */}
          <div className="relative flex items-center justify-center my-4 h-32">
            <span className="absolute h-44 w-44 animate-ping rounded-full bg-primary/[0.04] duration-1000" />
            <span className="absolute h-28 w-28 animate-ping rounded-full bg-primary/[0.06] duration-700" />
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15 shadow-lg shadow-primary/5">
              <AlertTriangle size={26} className="text-primary" strokeWidth={2} />
            </span>
          </div>

          {/* 404 block */}
          <h1 className="mt-6 text-[6.5rem] font-black leading-none tracking-[-0.05em] text-white lg:text-[8.5rem] drop-shadow-sm select-none">
            404
          </h1>
          
          <p className="mt-4 text-[15px] leading-relaxed text-white/60 font-medium">
            This route doesn&apos;t exist in the RoadRescue network. Let&apos;s get you back on track.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full">
            <Link
              href="/"
              className="inline-flex h-[48px] flex-1 min-w-[140px] items-center justify-center gap-2 rounded-[12px] bg-primary px-6 text-[13px] font-black text-[#1F1B10] transition-all hover:bg-primary/90 hover:-translate-y-[2px] active:translate-y-0 hover:shadow-lg hover:shadow-primary/10"
            >
              <Home size={15} strokeWidth={2.4} />
              Go Home
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-[48px] flex-1 min-w-[140px] items-center justify-center gap-2 rounded-[12px] border border-white/15 bg-white/5 px-6 text-[13px] font-bold text-white/90 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white hover:-translate-y-[2px] active:translate-y-0"
            >
              <ArrowLeft size={15} />
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* ===== RIGHT: Action panel ===== */}
      <div className="flex min-h-[50vh] flex-col justify-center bg-[#FFF8EA] px-8 py-16 lg:min-h-screen lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto flex flex-col gap-8">

          {/* Eyebrow */}
          <div className="w-fit inline-flex items-center gap-2 rounded-full border border-[#DDD0A8] bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7A6B3E] shadow-sm">
            <Search size={12} strokeWidth={2.5} />
            Page Unavailable
          </div>

          {/* Heading + body */}
          <div className="space-y-4">
            <h2 className="text-[2rem] font-black leading-tight tracking-[-0.03em] text-[#1F1B10] lg:text-4xl">
              Check the address or return to your dashboard.
            </h2>
            <p className="text-[15px] leading-relaxed text-[#6B5E3E] font-medium">
              The page you requested isn&apos;t available. Head to your dashboard to continue your rescue workflow.
            </p>
          </div>

          {/* Primary CTA */}
          <Link
            href={dashboardHref}
            className="inline-flex h-[54px] w-full items-center justify-center rounded-[14px] bg-[#1A1609] px-6 text-[14px] font-black text-white tracking-wide transition-all hover:bg-[#2A2211] hover:-translate-y-[2px] active:translate-y-0 hover:shadow-xl hover:shadow-black/15"
          >
            {dashboardLabel}
          </Link>

          {/* Divider */}
          <div className="border-t border-[#E5D9B6]" />

          {/* Help card */}
          <div className="rounded-[18px] border border-[#DDD0A8]/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-[#DDD0A8]">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3CC] text-[#8A6B08]">
                <MapPin size={16} strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[14px] font-black text-[#1F1B10]">Need help?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#6B5E3E]">
                  Sign in again to return to your dashboard and resume your active session.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom wordmark */}
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#B8A880] select-none">
            RoadRescue · Ghana
          </p>

        </div>
      </div>

    </div>
  )
}