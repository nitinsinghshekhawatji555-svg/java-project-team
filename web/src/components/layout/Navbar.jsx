'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import useHideOnScroll from '@/hooks/useHideOnScroll'
import { ArrowLeft, Bell, CircleHelp, LogOut, Menu, Search, ShieldCheck, X, Fuel } from 'lucide-react'
import Link from 'next/link'

import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useFuelLayer } from '@/hooks/useFuelLayer'
import { signOut } from '@/lib/auth'
import { timeAgo, truncate } from '@/lib/utils'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const notificationRef = useRef(null)
  const mobileNotificationRef = useRef(null)

  const pathname = usePathname()
  const { user, profile } = useAuth()
  const role = profile?.role || 'driver'
  const roleBase = `/dashboard/${role}`
  const isDashboardRoot = pathname === roleBase || pathname === `${roleBase}/`

  const visibleOnScroll = useHideOnScroll({ threshold: 10, initialVisible: true })
  const visible = isDashboardRoot ? visibleOnScroll : true
  const [greeting] = useState(() => {
    const hrs = new Date().getHours()
    return hrs < 12 ? 'Good morning' : hrs < 17 ? 'Good afternoon' : 'Good evening'
  })
  const router = useRouter()
  
  const { notifications, unreadCount, markAsRead, markAllAsRead, getNotificationHref } = useNotifications(profile?.id || user?.id)

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    const encoded = encodeURIComponent(searchQuery.trim())

    if (role === 'driver') {
      router.push(`/dashboard/driver?search=${encoded}`)
    } else if (role === 'mechanic') {
      router.push(`/dashboard/mechanic?search=${encoded}`)
    } else if (role === 'admin') {
      router.push(`/dashboard/admin?search=${encoded}`)
    }
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        !notificationRef.current?.contains(event.target) &&
        !mobileNotificationRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  const fullName = profile?.full_name || 'member'

  const [showFuel, toggleFuel, , isHydrated] = useFuelLayer()

  const handleToggleFuel = () => {
    toggleFuel()
  }

  const isTrackingPage = pathname?.includes('/request/') && role === 'driver'

  async function handleSignOut() {
    await signOut()
    router.replace('/auth/login')
  }

  const handleProfileClick = () => {
    router.push(`/dashboard/${role}/account`)
  }

  const handleBack = () => {
    if (pathname) {
      const parts = pathname.split('/')
      if (parts.length > 3) {
        const parentPath = parts.slice(0, -1).join('/')
        router.push(parentPath)
        return
      }
    }
    router.push(roleBase)
  }

  const getRoleLabel = () => {
    if (role === 'admin') return 'Admin Portal'
    if (role === 'mechanic') return 'Mechanic Console'
    return 'User Panel'
  }

  const getMobileTitle = () => {
    if (isDashboardRoot) return `${getRoleLabel()}`
    if (pathname.includes('/request/')) return 'Live tracking'
    if (pathname.includes('/activity')) return 'Activity Log'
    if (pathname.includes('/history')) return 'Job History'
    if (pathname.includes('/account')) return 'Profile'
    if (pathname.includes('/reports')) return 'Incident Reports'
    if (pathname.includes('/mechanics')) return 'Verified Mechanics'
    if (pathname.includes('/requests')) return 'Active Dispatch'

    return `${getRoleLabel()}`
  }

  const mobileSubtitle = isDashboardRoot
    ? 'System online & ready'
    : pathname.includes('/request/')
      ? 'Track responder coordinates'
      : pathname.includes('/account')
        ? `${profile?.full_name || 'Secure session'}`
        : 'Secure session'

  // Safety Extraction Check: Prioritize live database field string, fallback directly onto active login context parameters
  const authenticatedEmail = profile?.email || user?.email || 'authenticated@roadrescue.gh'

  const hasAvatar = !!profile?.avatar_url;

  return (
    <header className={`fixed top-0 left-0 right-0 md:left-64 z-[900] transition-transform duration-300 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
    
      {/*  MOBILE HEADER DISPLAY GRID  */}

      <div ref={mobileNotificationRef} className="md:hidden bg-[#1E1B15] text-[#EFE8D4] shadow-2xl transition-all duration-300 border-b border-white/[0.08] relative">
        {isDashboardRoot ? (
          <div className="px-5 pb-5 pt-4">
            {/* Top row: Greeting & Profile/Notification Toggles */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#A29A84] truncate opacity-85" suppressHydrationWarning>
                  {greeting},
                </p>
                <h1 className="text-lg font-bold text-primary truncate">
                  {fullName}
                </h1>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setOpen((prev) => !prev)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#EFE8D4] border border-white/10 active:scale-95 transition-transform cursor-pointer"
                  aria-label="Open notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-[#1E1B15] shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </>
                  )}
                </button>

                 <button
                   onClick={handleProfileClick}
                   className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full active:scale-95 transition-transform bg-transparent cursor-pointer"
                   aria-label="Open profile"
                 >
                   <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size="sm" />
                 </button>
              </div>
            </div>
          </div>
        ) : (
          /* Sub-route / Inner Page Header context */
          <div className="relative px-5 py-4 flex items-center justify-between gap-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={handleBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFE8D4] text-[#1E1B15] shadow-sm active:scale-95 transition-transform cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
              </button>

              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary block">{getMobileTitle()}</span>
                <p className="mt-0.5 truncate text-xs text-[#A29A84] font-medium">{mobileSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isTrackingPage && isHydrated && (
                <button
                  type="button"
                  onClick={handleToggleFuel}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${
                    showFuel
                      ? 'bg-amber-500 text-white border-amber-400'
                      : 'bg-white/10 text-[#EFE8D4] border-white/10 hover:bg-white/20'
                  }`}
                >
                  <Fuel size={12} className={showFuel ? 'animate-pulse' : ''} />
                  <span>{showFuel ? 'Fuel On' : 'Fuel Off'}</span>
                </button>
              )}

              <button
                onClick={() => setOpen((prev) => !prev)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-[#EFE8D4] border border-white/10 cursor-pointer"
                aria-label="Open notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary animate-ping" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8.5px] font-black text-[#1E1B15]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-[#EFE8D4] border border-white/10 cursor-pointer"
                aria-label="Open menu"
              >
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>

            {/* Mobile Context Dropdown menu */}
            {mobileMenuOpen && (
              <div className="absolute right-5 top-[60px] z-[9999] w-48 overflow-hidden rounded-xl border border-white/15 bg-[#26221A] p-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleProfileClick()
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#EFE8D4] hover:bg-white/10 cursor-pointer"
                >
                  <span>Profile</span>
                  <ShieldCheck size={14} className="text-emerald-400" />
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-400 hover:bg-red-500/15 cursor-pointer"
                >
                  <span>Sign Out</span>
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Universal Mobile Notification Pull-down Layer */}
        {open && (
          <div className="border-t border-white/[0.06] bg-[#1A1813] max-h-72 overflow-y-auto animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
              <span className="text-xs font-bold text-[#A29A84]">Active Updates ({unreadCount})</span>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} className="text-[11px] font-bold text-primary hover:underline cursor-pointer">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-[#6C6552]">No active updates</div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={getNotificationHref(n, profile?.role) || '#'}
                  onClick={async (e) => {
                    if (!getNotificationHref(n, profile?.role)) e.preventDefault()
                    await markAsRead(n.id)
                    setOpen(false)
                  }}
                  className="block px-5 py-3 border-b border-white/[0.02] active:bg-white/[0.04] bg-primary/[0.03] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#EFE8D4] truncate">{n.title || 'Update'}</p>
                    <Badge label={n.type} variant={n.type} />
                  </div>
                  <p className="mt-0.5 text-xs text-[#A29A84] line-clamp-2">{n.message}</p>
                  <p className="mt-1 text-[10px] text-[#786D53]">{timeAgo(n.created_at)}</p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* DESKTOP HEADER DISPLAY GRID                                         */}

      <div className="hidden items-center justify-between gap-4 border-b border-[#D8CCAE] bg-[#F5F0E2] px-4 py-3.5 md:flex lg:px-6">
        
        {/* Left: Brand Container - Clamped to prevent pushing items right */}
        <div className="min-w-0 shrink-0 flex items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-black text-[#6A5A10] tracking-tight">RoadRescue</h1>
          <span className="hidden xl:inline-block rounded-full border border-[#C8BC9E] bg-[#EFE6D1] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#6F654D]">
            {role === 'admin' ? 'Operations' : role === 'mechanic' ? 'Field Service' : 'Client System'}
          </span>
        </div>


        {/* Right: Action Controls Anchor Group (shrink-0 so it is never compressed) */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 lg:gap-3">
          {isTrackingPage && (
            <button
              type="button"
              onClick={handleToggleFuel}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
                showFuel
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Fuel size={14} className={showFuel ? 'animate-pulse' : ''} />
              <span>{showFuel ? 'Fuel Stations' : 'Fuel Off'}</span>
            </button>
          )}

          {/* Notification Menu Container */}
          <div ref={notificationRef} className="relative shrink-0">
            <button type="button" onClick={() => setOpen((prev) => !prev)} className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#D7CCAD] bg-[#F8F4EA] text-[#3B3528] shadow-sm active:scale-95 transition-transform cursor-pointer">
              <Bell size={18} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-[#1E1B15] shadow-xs ring-2 ring-[#F5F0E2]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-xl z-50">
                <div className="flex items-center justify-between border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Notifications</p>
                    <p className="text-[11px] text-slate-500">Live updates ({unreadCount} active)</p>
                  </div>
                  {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs font-bold text-amber-600 hover:underline cursor-pointer">Mark all read</button>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium">No active alerts recorded</div>
                  ) : (
                    notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={getNotificationHref(notification, profile?.role) || '#'}
                        onClick={async (event) => {
                          const href = getNotificationHref(notification, profile?.role)
                          if (!href) event.preventDefault()
                          await markAsRead(notification.id)
                          setOpen(false)
                        }}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-[#FFF9EF] bg-amber-50/40"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900">{notification.title || 'Dispatch Update'}</p>
                          <Badge label={notification.type} variant={notification.type} />
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{truncate(notification.message, 90)}</p>
                        <p className="mt-2 text-[10px] font-medium text-slate-400">{timeAgo(notification.created_at)}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Quick-Link Widget */}
          <button
            onClick={handleProfileClick}
            className="hidden sm:flex items-center gap-2.5 rounded-xl border border-[#D7CCAD] bg-[#F8F4EA] px-3 py-1.5 transition hover:bg-[#EFE6D1] shrink-0 max-w-[200px] lg:max-w-xs cursor-pointer"
          >
            <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} online={true} className="shrink-0" />
            <div className="leading-tight text-left min-w-0 hidden xl:block">
              <p className="text-xs font-black text-[#2D271C] truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] text-[#6E634B] font-medium truncate">{authenticatedEmail}</p>
            </div>
          </button>

          {/* Sign Out Trigger Button */}
          <button
            onClick={handleSignOut}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 lg:px-4 text-xs font-black uppercase tracking-wider text-red-700 shrink-0 transition hover:bg-red-100 cursor-pointer"
          >
            <LogOut size={14} />
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}