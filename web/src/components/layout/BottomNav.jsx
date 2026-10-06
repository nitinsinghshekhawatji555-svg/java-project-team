'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Home, Wrench, Brain, ArrowUpDown, User, ClipboardList, History, MapPin, Briefcase } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'

const driverNav = [
  { href: '/dashboard/driver', label: 'Home', icon: Home, isActive: (p) => p === '/dashboard/driver' || p === '/dashboard/driver/' },
  { href: '/dashboard/driver/ai', label: 'AI Assist', icon: Brain, isActive: (p) => p.startsWith('/dashboard/driver/ai') },
  { href: '/dashboard/driver/history', label: 'Activity', icon: ArrowUpDown, isActive: (p) => p.startsWith('/dashboard/driver/history') || p.startsWith('/dashboard/driver/activity') },
  { href: '/dashboard/driver/account', label: 'Profile', icon: User, isActive: (p) => p.startsWith('/dashboard/driver/account') },
]

const mechanicNav = [
  { href: '/dashboard/mechanic', label: 'Jobs', icon: Briefcase, isActive: (p) => p === '/dashboard/mechanic' || p === '/dashboard/mechanic/' || p.includes('/dashboard/mechanic/jobs') || p.includes('/dashboard/mechanic/job/') },
  { href: '/dashboard/mechanic/requests', label: 'Requests', icon: ClipboardList, isActive: (p) => p.startsWith('/dashboard/mechanic/requests') },
  { href: '/dashboard/mechanic/navigation', label: 'Navigation', icon: MapPin, isActive: (p) => p.startsWith('/dashboard/mechanic/navigation') || p.startsWith('/dashboard/mechanic/track') },
  { href: '/dashboard/mechanic/history', label: 'Activity', icon: History, isActive: (p) => p.startsWith('/dashboard/mechanic/history') || p.startsWith('/dashboard/mechanic/activity') },
  { href: '/dashboard/mechanic/account', label: 'Profile', icon: User, isActive: (p) => p.startsWith('/dashboard/mechanic/account'), tourId: 'mechanic-nav-profile' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuth()
  const role = profile?.role || 'driver'
  const isKeyboardOpen = useKeyboardOpen()

  if (role === 'admin') return null

  // Hide the entire nav when the keyboard is open — avoids it
  // floating over the input dock and wasting visible screen space.
  if (isKeyboardOpen) return null

  const handleEmergency = () => router.push('/dashboard/driver/explore')

  const renderNavItem = (item) => {
    const Icon = item.icon
    const isActive = item.isActive(pathname)

    return (
      <Link
        key={item.href}
        href={item.href}
        data-tour={item.tourId}
        className="flex flex-col items-center justify-center pt-2.5 pb-2 px-1 transition-all duration-200 ease-in-out group min-w-15 active:scale-95"
        aria-current={isActive ? 'page' : undefined}
      >
        <div className={`inline-flex h-9 w-12 items-center justify-center rounded-xl transition-all duration-200 ease-in-out ${
          isActive 
            ? 'bg-primary/15 text-primary scale-110 shadow-sm shadow-primary/10' 
            : 'bg-transparent text-[#A29A84] group-hover:text-[#EFE8D4]'
        }`}>
          <Icon size={19} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-200 ease-in-out group-active:scale-110" />
        </div>
        <span className={`mt-1.5 text-[9.5px] font-black uppercase tracking-wider transition-colors duration-200 ${isActive ? 'text-primary' : 'text-[#A29A84]'}`}>
          {item.label}
        </span>
      </Link>
    )
  }

  // ── MECHANIC: flat 5-tab bar 
  if (role === 'mechanic') {
    return (
      <div className="bottom-nav-container fixed left-0 right-0 bottom-0 z-50 md:hidden bg-[#1E1B15] border-t border-white/[0.08] pt-1.5 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-10px_35px_rgba(0,0,0,0.55)] transition-all duration-150">
        <nav className="mx-auto flex w-full items-center justify-between max-w-md h-20">
          {mechanicNav.map(renderNavItem)}
        </nav>
      </div>
    )
  }

  // ── DRIVER: split cradle with center SOS button ────
  const halfLength = Math.ceil(driverNav.length / 2)
  const leftItems = driverNav.slice(0, halfLength)
  const rightItems = driverNav.slice(halfLength)

  return (
    <div className="bottom-nav-container fixed left-0 right-0 bottom-0 z-50 md:hidden pointer-events-none pb-[calc(env(safe-area-inset-bottom)+0.25rem)] transition-all duration-150">

      {/* Floating SOS button with soft elevation and pulse animation */}
      <div className="absolute left-1/2 -top-8 -translate-x-1/2 z-50">
        <button
          onClick={handleEmergency}
          aria-label="Request Rescue"
          className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-[#1E1B15] active:scale-90 hover:scale-105 transition-all duration-200 ease-in-out relative group"
          style={{
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
          }}
        >
          {/* Radar beacon pulse ring */}
          <span className="absolute inset-0 rounded-full bg-primary animate-pulse-ring pointer-events-none z-[-1]" />
          
          <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-active:opacity-100 transition-opacity" />
          <Wrench size={22} strokeWidth={2.5} className="transform group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Nav bar with straight clean top edge */}
      <nav className="pointer-events-auto relative w-full bg-[#1E1B15] border-t border-white/[0.08] pt-1.5 px-2 shadow-[0_-10px_35px_rgba(0,0,0,0.55)]">
        <div className="relative z-30 mx-auto flex w-full items-center justify-between max-w-md h-20">
          <div className="flex flex-1 items-center justify-around">
            {leftItems.map(renderNavItem)}
          </div>
          <div className="w-20 shrink-0 h-full" />
          <div className="flex flex-1 items-center justify-around">
            {rightItems.map(renderNavItem)}
          </div>
        </div>
      </nav>
    </div>
  )
}