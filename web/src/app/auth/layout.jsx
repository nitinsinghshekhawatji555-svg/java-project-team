'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import RotatingTips from '@/components/layout/RotatingTips'

const backgroundVideo = '/images/background-rotating-tips.mp4'

function AuthLayoutContent({ children }) {
  return (
    <div className="min-h-screen w-full bg-[#FFF8EA] text-[#1F1B10]">

      {/* ================================================================ */}
      {/*DESKTOP LAYOUT                                                    */}
      {/* ================================================================ */}
      <div className="hidden lg:grid min-h-screen w-full grid-cols-2 items-stretch">

        {/* LEFT COLUMN: Video + Branding + Tips */}
        <div className="relative overflow-hidden bg-[#1A1609] flex flex-col justify-between p-12 xl:p-16 w-full">

          {/* Layer 1: Ambient gradient base */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(245,209,8,0.16),transparent_38%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_5%,rgba(255,255,255,0.07),transparent_28%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#1A1609_0%,#231D0B_55%,#161209_100%)]" />
            {/* Subtle dot-grid — matches onboarding panel for visual continuity */}
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
          </div>

          {/* Layer 2: Background video */}
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-[0.15] mix-blend-screen"
            src={backgroundVideo}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />

          {/* TOP: Brand tag */}
          <div className="relative z-10">
            <div className="w-fit inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-sm text-white/70">
              <Image
                src="/images/logo.png"
                alt="RoadRescue"
                width={24}
                height={24}
                className="rounded-full h-auto w-auto"
              />
              Ghana Roadside Emergency Network
            </div>
          </div>

          {/* MIDDLE: Tips — vertically centered */}
          <div className="relative z-10 flex-1 flex items-center">
            <div className="w-full max-w-xl xl:max-w-2xl mx-auto text-left text-white">
              <RotatingTips />
            </div>
          </div>

          {/* BOTTOM: System status line */}
          <div className="relative z-10">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/20">
              RoadRescue · Secure Auth Portal · Ghana
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Form children */}
        <div className="bg-[#FFF8EA] flex items-center justify-center w-full px-8 py-16 sm:px-16 lg:px-20 xl:px-28">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE LAYOUT                                                     */}
      {/* ================================================================ */}
      <div className="lg:hidden flex flex-col min-h-screen bg-[#FFF8EA]">

        {/* Top nav bar */}
        <div className="flex items-center justify-between border-b border-[#E5D9B6] bg-[#FFF9EF] px-5 py-4">
          <span className="text-xl font-black tracking-tight text-[#8A6B08]">RoadRescue</span>
          <span className="rounded-full border border-[#D8C99A] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A6718]">
            Secure
          </span>
        </div>

        {/* Form area — vertically centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>

    </div>
  )
}

export default dynamic(() => Promise.resolve(AuthLayoutContent), {
  ssr: false,
  loading: () => <div className="min-h-screen w-full bg-[#FFF8EA]" />
})