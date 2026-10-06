'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { 
  ChartColumn, Gauge, History, Home, LifeBuoy, LogOut, Radar, Settings, 
  ShieldCheck, User, ClipboardList, WifiSync, Brain, PlusCircle, MapPin, 
  X, AlertTriangle, HelpCircle 
} from 'lucide-react'

import Avatar from '@/components/ui/Avatar'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import toast from 'react-hot-toast'
import { useMechanicStatus } from '@/hooks/useMechanicStatus'
import { useOnboarding } from '@/hooks/useOnboarding'

const navByRole = {
  driver: [
    { href: '/dashboard/driver', label: 'Dashboard', icon: Home },
    { href: '/dashboard/driver/explore', label: 'Explore Map', icon: MapPin },
    { href: '/dashboard/driver/ai', label: 'AI Diagnostics', icon: Brain },
    { href: '/dashboard/driver/history', label: 'Incident Archive', icon: History },
    { href: '/dashboard/driver/account', label: 'Account', icon: User },
  ],
  mechanic: [
    { href: '/dashboard/mechanic', label: 'Dashboard', icon: Home },
    { href: '/dashboard/mechanic/requests', label: 'Active Jobs', icon: Radar },
    { href: '/dashboard/mechanic/history', label: 'Job History', icon: History },
    { href: '/dashboard/mechanic/navigation', label: 'Navigation', icon: MapPin },
    { href: '/dashboard/mechanic/support', label: 'Support', icon: LifeBuoy },
    { href: '/dashboard/mechanic/account', label: 'Profile', icon: User, tourId: 'mechanic-nav-profile' },
  ],
  admin: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: Gauge },
    { href: '/dashboard/admin/reviews', label: 'Edits Review', icon: ShieldCheck },
    { href: '/dashboard/admin/requests', label: 'Incidents', icon: Radar },
    { href: '/dashboard/admin/mechanics', label: 'Mechanics', icon: User },
    { href: '/dashboard/admin/reports', label: 'Analytics', icon: ChartColumn },
    { href: '/dashboard/admin/users', label: 'Identity Hub', icon: ShieldCheck },
 
  ],
}

export default function Sidebar({ initialRole = null }) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, user, loading } = useAuth()

  // Derive role with progressive fallbacks to prevent blank screen / hydration flash
  const urlRole = pathname?.startsWith('/dashboard/admin')
    ? 'admin'
    : pathname?.startsWith('/dashboard/mechanic')
      ? 'mechanic'
      : pathname?.startsWith('/dashboard/driver')
        ? 'driver'
        : null

  const role = profile?.role || user?.user_metadata?.role || initialRole || urlRole || null
  const links = role ? navByRole[role] || [] : []
  
  const isAdmin = role === 'admin'
  const isMechanic = role === 'mechanic'
  const isDriver = role === 'driver'

  // Hook state tracking declarations
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const { isAvailable, updateStatus } = useMechanicStatus(isMechanic ? user?.id : null)
  const { resetTour } = useOnboarding('driver_skip_hint_v1')

  const handleAvailabilityToggle = async () => {
    if (isAvailable) {
      setShowOfflineModal(true)
    } else {
      try {
        await updateStatus('available')
        toast.success('Duty status configured: Online')
      } catch (e) {
        toast.error('Failed to go online')
      }
    }
  }

  const executeStatusUpdate = async (nextAvailableStatus) => {
    setShowOfflineModal(false)
    try {
      await updateStatus(nextAvailableStatus ? 'available' : 'offline')
      toast.success(`Duty status configured: ${nextAvailableStatus ? 'Online' : 'Offline'}`)
    } catch (err) {
      toast.error('Failed to update duty status')
    }
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/auth/login')
  }

  // Base theme definitions matching your exact color scheme matrix
  const sidebarClass = isAdmin
    ? 'bg-[#2A261C] text-[#EFE8D4] border-r border-[#3A3428]'
    : 'bg-[#F1EAD6] text-[#2A261C] border-r border-[#D8CCAE]'

  const activeClass = isAdmin
    ? 'bg-primary text-[#2A261C] font-black shadow-xs'
    : 'bg-primary text-[#2A261C] font-black shadow-xs'

  const idleClass = isAdmin
    ? 'text-[#E2D9C2] hover:bg-[#383223] hover:text-[#F5EED9] font-bold'
    : 'text-[#433C2B] hover:bg-[#E8DFC6] hover:text-[#2A261C] font-bold'

  // Render a neutral loading skeleton while auth/profile is resolving to avoid flashing the wrong role
  if (loading || !role) {
    return (
      <aside className="hidden md:fixed md:left-0 md:top-0 md:z-40 md:flex md:h-screen md:w-64 md:flex-col bg-[#F1EAD6] border-r border-[#D8CCAE] animate-pulse">
        {/* Branding placeholder */}
        <div className="px-5 pb-5 pt-6 text-center border-b border-black/5 mb-4">
          <div className="h-10 w-10 mx-auto rounded-full bg-[#D8CCAE]/50 mb-2" />
          <div className="h-3 w-24 mx-auto rounded bg-[#D8CCAE]/50" />
        </div>

        {/* Navigation placeholder items */}
        <div className="flex-1 space-y-1.5 px-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-[#D8CCAE]/40" />
          ))}
        </div>

        {/* Footer placeholder */}
        <div className="px-3 pb-4 pt-3 space-y-3 border-t border-black/5">
          <div className="h-10 rounded-xl bg-[#D8CCAE]/50" />
          <div className="rounded-xl border border-[#D8CCAE]/60 bg-[#EAE0C7]/50 p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#D8CCAE]/60" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 rounded bg-[#D8CCAE]/60" />
                <div className="h-2.5 w-12 rounded bg-[#D8CCAE]/40" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <>
      {/* Tablet-first shell: show the sidebar from md upward and keep mobile on bottom nav only */}
      <aside className={`hidden md:fixed md:left-0 md:top-0 md:z-40 md:flex md:h-screen md:w-64 md:flex-col ${sidebarClass}`}>
        
        {/* BRANDING LOGO BLOCK */}
        <div className="px-5 pb-5 pt-6 text-center border-b border-black/5 mb-3">
          <Image
            src="/images/logo.png"
            alt="RoadRescue"
            width={40}
            height={40}
            className="mx-auto rounded-full h-auto w-auto shadow-sm"
          />
          <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${isAdmin ? 'text-[#C1B596]' : 'text-[#786D53]'}`}>
            {isAdmin ? 'Ghana Operations' : isMechanic ? 'Mechanic Hub' : 'Driver Hub'}
          </p>
        </div>

        {/* CORE INTERACTIVE NAV LINKS */}
        <nav className="flex-1 space-y-1 px-3">
          {(() => {
            const activeHref = links.reduce((best, l) => {
              if (pathname === l.href || pathname.startsWith(`${l.href}/`)) {
                return !best || l.href.length > best.length ? l.href : best
              }
              return best
            }, '')

            return links.map((link) => {
              const Icon = link.icon
              const isActive = link.href === activeHref || pathname === link.href

              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  data-tour={link.tourId}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs uppercase tracking-wider transition-all duration-150 ${isActive ? activeClass : idleClass}`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span className="truncate">{link.label}</span>
                </Link>
              )
            })
          })()}
        </nav>

        {/* FOOTER USER MANAGEMENT & CTA HUB */}
        <div className="px-3 pb-4 pt-3 space-y-2.5 border-t border-black/5 bg-black/5">
          {isAdmin ? (
            <Link
              href="/dashboard/admin/requests"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black uppercase tracking-wider text-[#2A261C] shadow-sm hover:brightness-105 transition"
            >
              <ClipboardList size={14} /> Incident Log
            </Link>
          ) : isDriver ? (
            <div className="space-y-1.5">
              <Link
                href="/dashboard/driver/request/new"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-slate-800 transition"
              >
                <PlusCircle size={14} /> Request Aid
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await resetTour('driver_skip_hint_v1')
                  toast.success('Walkthrough reset! Next time you tap SOS, the guide will appear.')
                }}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D8CCAE]/70 bg-[#EAE0C7]/40 text-[10px] font-black uppercase tracking-wider text-[#6E644D] hover:bg-[#EAE0C7] transition cursor-pointer"
              >
                <HelpCircle size={12} /> Reactivate Hints
              </button>
            </div>
          ) : isMechanic ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleAvailabilityToggle}
                className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] cursor-pointer ${
                  isAvailable 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-primary text-[#2A261C] hover:bg-primary/90'
                }`}
              >
                <WifiSync size={14} className={isAvailable ? 'animate-pulse' : ''} />
                <span>{isAvailable ? 'Online (Duty)' : 'Go Online'}</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetTour('mechanic_v1')
                  toast.success('Tour reset! The mechanic walkthrough will appear.')
                }}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D8CCAE]/70 bg-[#EAE0C7]/40 text-[10px] font-black uppercase tracking-wider text-[#6E644D] hover:bg-[#EAE0C7] transition cursor-pointer"
              >
                <HelpCircle size={12} /> Take the tour again
              </button>
            </div>
          ) : null}

          {/* ACCOUNT SNAPSHOT PROFILE BOX */}
          <div className={`rounded-xl border p-3 ${isAdmin ? 'border-[#4A4230] bg-[#2F2A20]' : 'border-[#D8CCAE]/70 bg-[#EAE0C7]/60'}`}>
            {/* Profile section that navigates to the admin account route */}
            <div 
              onClick={() => router.push(isAdmin ? '/dashboard/admin/account' : isMechanic ? '/dashboard/mechanic/account' : '/dashboard/driver/account')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs font-black tracking-tight ${isAdmin ? 'text-[#F2EAD7]' : 'text-[#2A261C]'}`}>
                  {profile?.full_name || 'RoadRescue User'}
                </p>
                <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${isAdmin ? 'text-[#B6AA8D]' : 'text-[#6E644D]'}`}>
                  {role}
                </p>
              </div>
            </div>

            {/* Sign out button with e.stopPropagation() to prevent triggering the div's router push */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSignOut();
              }}
              className={`mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${isAdmin ? 'border-[#534B38] text-[#F2EAD7] hover:bg-[#3A3428]' : 'border-[#CDBD97] text-[#3D3627] hover:bg-[#E1D6BA]'}`}
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ================= CONFIRMATION OFFLINE MODAL ================= */}
      <Modal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        title="Disconnect from Dispatch?"
        size="sm"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeStatusUpdate(false)}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 hover:bg-red-50/50 cursor-pointer"
            >
              Confirm Offline
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowOfflineModal(false)}
              className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-primary hover:bg-primary/90 shadow-sm cursor-pointer"
            >
              Stay Online
            </Button>
          </>
        }
      >
        <div className="rounded-xl bg-[#FFF9EF] border border-[#E8DCC0] p-4">
          <p className="text-xs text-[#6C5E3B] font-medium leading-relaxed">
            Going offline removes your workshop profile from the active emergency network. You will not receive nearby breakdown alerts until you reconnect.
          </p>
        </div>
      </Modal>
    </>
  )
}