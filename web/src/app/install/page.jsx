'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Download, Share, PlusSquare, ArrowUpRight, ChevronRight, 
  Info, Shield, CheckCircle2, ArrowDown, Smartphone 
} from 'lucide-react'

export default function InstallOnboardingPage() {
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  // 1. Device detection and PWA install prompt handler
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    // Defer state updates to avoid synchronous setState lints in Next.js
    setTimeout(() => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      setIsIOS(isIOSDevice)

      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
        navigator.standalone
      setIsInstalled(isStandalone)
    }, 0)

    // Handle Android/Chrome PWA install prompt interception
    const handleInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)

    // Listen for PWA successful installation event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Trigger Android/Chrome native install dialog
  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FFF8EA] text-[#1F1B10] flex flex-col justify-between relative overflow-hidden">
      
      {/* Visual background ambient layers */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,209,8,0.12),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,209,8,0.06),transparent_40%)]" />
      </div>

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#E5D9B6] bg-[#FFF9EF] px-5 py-4 shrink-0 shadow-xs">
        <span className="text-xl font-black tracking-tight text-[#8A6B08]">RoadRescue</span>
        <span className="rounded-full border border-[#D8C99A] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A6718]">
          Install Guide
        </span>
      </header>

      {/* Main card panel */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white border border-[#DCCDA9] rounded-[2rem] p-6 shadow-md flex flex-col justify-between gap-6">
          
          {/* Top branding section */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFF9EF] border border-[#DCCDA9] flex items-center justify-center text-primary shadow-inner mb-3">
              <Smartphone size={28} className="text-[#8A6B08] stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">Install RoadRescue</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Add RoadRescue to your home screen for instant dispatch requests, push notifications, and reliable offline access.
            </p>
          </div>

          {/* Conditional onboarding instructions */}
          {isInstalled ? (
            /* Scenario 0: App is already installed */
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="text-sm font-bold text-emerald-800">Application Installed</h3>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                RoadRescue is configured as a standalone application on your device home screen. You can close this browser and launch it directly.
              </p>
            </div>
          ) : isIOS ? (
            /* Scenario 1: iOS Safari guided walkthrough */
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200/50 bg-[#FFFBEB] p-4 text-xs font-semibold text-[#8A6B08] flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>Apple iOS requires installing standalone applications through Safari&#39;s native share system.</span>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7C6B44]">Visual Step-by-Step Guide</p>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F1B10] text-[10px] font-black text-white">1</span>
                    <span className="text-[12.5px] text-slate-700 leading-snug">
                      Tap Safari&#39;s **Share** button <Share size={14} className="inline text-slate-800 mx-0.5 relative -top-0.5" /> in the bottom navigation bar.
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F1B10] text-[10px] font-black text-white">2</span>
                    <span className="text-[12.5px] text-slate-700 leading-snug">
                      Scroll down the options sheet and tap **Add to Home Screen** <PlusSquare size={14} className="inline text-slate-800 mx-0.5 relative -top-0.5" />.
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F1B10] text-[10px] font-black text-white">3</span>
                    <span className="text-[12.5px] text-slate-700 leading-snug">
                      Tap **Add** in the top-right corner to complete setting up your workspace portal.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Scenario 2: Android / Chrome one-tap install or Chrome menu instructions */
            <div className="space-y-4">
              {deferredPrompt ? (
                <div className="space-y-3">
                  <button
                    onClick={handleInstallClick}
                    className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black uppercase tracking-wider text-[#1F1B10] shadow-md hover:bg-primary/90 active:scale-98 transition duration-150"
                  >
                    <Download size={16} strokeWidth={2.5} />
                    One-Tap Install Application
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    Installs instantly and launches as a fullscreen app.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-amber-200/50 bg-[#FFFBEB] p-4 text-xs font-semibold text-[#8A6B08] flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>Programmatic prompt unavailable. You can install RoadRescue manually via your browser options.</span>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7C6B44]">Manual Chrome Steps</p>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F1B10] text-[10px] font-black text-white">1</span>
                      <span className="text-[12.5px] text-slate-700 leading-snug">
                        Tap the browser menu button (Three Dots) in the top-right toolbar.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F1B10] text-[10px] font-black text-white">2</span>
                      <span className="text-[12.5px] text-slate-700 leading-snug">
                        Select **Install app** or **Add to Home screen** from the list.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom redirection CTA */}
          <div className="border-t border-[#F0E8D0] pt-4 flex flex-col gap-2.5">
            <Link
              href="/auth/login"
              className="w-full flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-[#1F1B10] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2C2618] transition-all"
            >
              Continue to Login Screen
              <ArrowUpRight size={13} />
            </Link>
          </div>

        </div>
      </main>

      {/* Guided tooltips pointing at mobile browsers bottom bar for iOS users */}
      {isIOS && !isInstalled && (
        <div className="relative z-20 mx-auto w-full max-w-sm flex flex-col items-center pb-8 animate-bounce">
          <div className="bg-[#1F1B10] border border-white/10 rounded-xl px-4 py-2 text-white shadow-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-2">
            <Share size={12} className="text-primary" />
            Safari Share Sheet is below
          </div>
          <ArrowDown size={18} className="text-[#1F1B10] mt-1.5" />
        </div>
      )}

      {/* Footer copyright */}
      <footer className="relative z-10 border-t border-[#E5D9B6]/40 bg-[#FFF9EF]/50 px-5 py-4 text-center shrink-0">
        <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-[#7C6B44]/70">
          RoadRescue · Offline PWA Hub · Ghana
        </p>
      </footer>

    </div>
  )
}
