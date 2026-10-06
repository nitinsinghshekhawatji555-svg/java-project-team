'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, BadgeInfo, CarFront, Wrench, MapPin } from 'lucide-react'

const roleCards = [
  {
    id: 'driver-card',
    href: '/auth/register?role=driver',
    title: 'Need Assistance?',
    description: 'Request urgent mechanical help and track a responder to your location.',
    icon: CarFront,
    accent: 'bg-primary text-[#1F1B10]',
    tag: 'Driver',
  },
  {
    id: 'mechanic-card',
    href: '/auth/register?role=mechanic',
    title: 'Provide Assistance?',
    description: 'Find stranded motorists, provide aid, and earn on your schedule.',
    icon: Wrench,
    accent: 'bg-[#D9DDF3] text-[#4C5A7A]',
    tag: 'Mechanic',
  },
]

export default function OnboardingPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-[#FFF8EA] text-[#1F1B10] lg:grid lg:grid-cols-2 select-none">

      {/* ===== DESKTOP SIDEBAR HERO ===== */}
      {!isMobile ? (
        <section
          key="desktop-hero"
          className="relative hidden overflow-hidden bg-[#1A1609] lg:flex lg:min-h-screen lg:flex-col lg:justify-between p-12 xl:p-16 w-full"
        >
          {/* Ambient gradients */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(245,209,8,0.14),transparent_38%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_5%,rgba(255,255,255,0.07),transparent_28%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#1A1609_0%,#231D0B_55%,#161209_100%)]" />
            {/* Subtle grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col gap-10 w-full max-w-xl xl:max-w-2xl mx-auto text-white flex-1 justify-center">

            {/* Eyebrow + Headline */}
            <div className="flex flex-col gap-7">
              <div className="w-fit inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-sm text-white/70">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E5B800] text-[#1F1B10]">
                  <BadgeInfo size={13} />
                </span>
                Roadside Emergency Network
              </div>

              <div>
                <h1 className="text-[2.85rem] font-black leading-[0.93] tracking-[-0.03em] xl:text-6xl">
                  The reliable way<br />
                  <span className="text-primary">back on the road.</span>
                </h1>
                <p className="mt-5 text-[15px] leading-7 text-white/60 max-w-sm">
                  Connecting stranded drivers with certified mechanics and recovery specialists across Ghana — instantly.
                </p>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="relative h-[22rem] overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#3a2a05] via-[#241b04] to-[#14100a] shadow-2xl shadow-black/60">

              {/* Glow core */}
              <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />

              {/* Pulsing map pin motif */}
              <div className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <span className="absolute h-20 w-20 animate-ping rounded-full bg-[#E5B800]/10" />
                <span className="absolute h-12 w-12 animate-ping rounded-full bg-[#E5B800]/15" />
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#E5B800] border border-[#E5B800]/30 backdrop-blur">
                  <MapPin size={16} className="text-[#1F1B10]" />
                </span>
              </div>

              {/* Top badge */}
              <div className="absolute inset-x-0 top-5 flex justify-center">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 backdrop-blur-sm">
                  24/7 · On-Demand Dispatch
                </span>
              </div>

              {/* Bottom info card */}
              <div className="absolute inset-x-5 bottom-5 xl:inset-x-6 xl:bottom-6">
                <div className="rounded-[18px] border border-white/[0.08] bg-black/40 p-4 backdrop-blur-md">
                  <div className="flex items-start gap-3.5 text-white">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E5B800] text-[#1F1B10]">
                      <CarFront size={22} />
                    </span>
                    <div>
                      <p className="text-[15px] font-black tracking-tight">Emergency Dispatch</p>
                      <p className="mt-0.5 text-[13px] leading-5 text-white/55">
                        Real-time tracking for breakdowns, punctures, and towing across Ghana.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom wordmark */}
          <div className="relative z-10 w-full max-w-xl xl:max-w-2xl mx-auto mt-10">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/20">RoadRescue · Ghana</p>
          </div>
        </section>
      ) : null}

      {/* ===== RIGHT PANEL: ONBOARDING ===== */}
      <section className="flex min-h-screen items-center justify-center bg-[#FFF8EA] px-6 py-12 sm:px-12 md:px-16 lg:h-full lg:px-12 xl:px-24">
        <div className="w-full max-w-xl lg:max-w-2xl space-y-9">

          {/* Mobile header */}
          {isMobile && (
            <div key="mobile-header-group" className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#E5D9B6] pb-4">
                <span className="text-[22px] font-black tracking-tight text-[#8A6B08]">RoadRescue</span>
                <span className="rounded-full border border-[#D8C99A] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A6718]">
                  Ghana
                </span>
              </div>

              {/* Mobile hero card */}
              <div className="relative h-60 overflow-hidden rounded-[22px] border border-[#C8B57A]/30 bg-[#1A1609] shadow-lg">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_25%,rgba(245,209,8,0.18),transparent_38%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,209,8,0.06),rgba(26,22,9,0.94)_60%,#1A1609_100%)]" />
                </div>

                {/* Pulse */}
                <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span className="absolute h-16 w-16 animate-ping rounded-full bg-[#E5B800]/10" />
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#E5B800] border border-[#E5B800]/30">
                    <MapPin size={13} className="text-[#1F1B10]" />
                  </span>
                </div>

                <div className="absolute inset-x-0 top-4 flex justify-center">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
                    24/7 · Roadside Rescue
                  </span>
                </div>
                <div className="absolute inset-x-4 bottom-4 rounded-[14px] border border-white/[0.08] bg-black/40 p-3.5 backdrop-blur-md">
                  <div className="flex items-center gap-3 text-white">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5B800] text-[#1F1B10]">
                      <CarFront size={18} />
                    </span>
                    <div>
                      <p className="text-[13px] font-black">Emergency Dispatch</p>
                      <p className="text-[11px] text-white/55 leading-4 mt-0.5">Connecting you to nearby assistance.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Heading block */}
          <div className="space-y-2.5">
            <h1 className="text-[2rem] font-black leading-tight tracking-[-0.025em] text-[#1F1B10] sm:text-4xl xl:text-5xl">
              Get Started with RoadRescue
            </h1>
            <p className="text-[15px] leading-[1.7] text-[#6B5E3E] sm:text-base">
              Choose how you&apos;d like to use the platform.
            </p>
          </div>

          {/* Role cards */}
          <div className="space-y-3">
            {roleCards.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.id}
                  href={card.href}
                  className="group relative flex items-center gap-4 rounded-[18px] border border-[#DDD0A8] bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:border-[#C9B06A] hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.10)]"
                >
                  <span className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl ${card.accent}`}>
                    <Icon size={22} strokeWidth={2.3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[17px] font-black text-[#1F1B10] tracking-tight">{card.title}</p>
                      {/* <span className="rounded-full bg-[#F5F0E0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A7240]">
                        {card.tag}
                      </span> */}
                    </div>
                    <p className="mt-0.5 text-[13.5px] leading-5 text-[#6B5E3E]">{card.description}</p>
                  </div>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-[#B8A06A] transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              )
            })}
          </div>

          {/* CTA row */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Link
              href="/auth/login"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-[15px] font-black text-[#1F1B10] shadow-sm hover:shadow-md transition-all duration-200 hover:bg-primary/90 hover:-translate-y-[1px] active:translate-y-0"
            >
              Get Started
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] border border-[#CEC0A0] bg-white px-6 text-[15px] font-bold text-[#1F1B10] transition-all duration-200 hover:bg-[#F8F2E0] hover:border-[#BCA86A]"
            >
              Sign In
            </Link>
          </div>

          {/* Trust badges */}
          <div className="border-t border-[#E5D9B6] pt-6">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[14px] border border-[#E5DCC4] bg-white px-4 py-3 text-[13px] text-[#6B5E3E] shadow-sm">
                <ShieldCheck size={16} className="shrink-0 text-[#8A6B08]" />
                <span className="font-medium">Verified Rescue Partners</span>
              </div>
              <div className="flex items-center gap-3 rounded-[14px] border border-[#E5DCC4] bg-white px-4 py-3 text-[13px] text-[#6B5E3E] shadow-sm">
                <span className="font-black text-[#8A6B08] text-[14px]">24/7</span>
                <span className="font-medium">Priority Support Coverage</span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}