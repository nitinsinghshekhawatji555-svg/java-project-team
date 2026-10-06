'use client'

import { useEffect, useState, useMemo } from 'react'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { 
  Users, Mail, Phone, Wrench, Car, 
  X, CheckCircle, Info, Calendar, Star,
  Search, ShieldAlert, ChevronLeft, ChevronRight
} from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [inspecting, setInspecting] = useState(false)
  const [suspending, setSuspending] = useState(false)

  // Filters & State
  const [activeTab, setActiveTab] = useState('all') // 'all', 'driver', 'mechanic', 'admin'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'pending', 'suspended'
  const [sortOption, setSortOption] = useState('name_asc') // 'name_asc', 'newest', 'oldest'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    let mounted = true

    async function loadUsers() {
      if (mounted) setLoading(true)
      try {
        const response = await fetch('/api/admin/users', { cache: 'no-store' })
        const payload = await response.json()
        if (response.ok && mounted) {
          setUsers(payload.users || [])
        }
      } catch (err) {
        console.error('Failed to parse identity registry:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadUsers()
    return () => { mounted = false }
  }, [])

  // Suspend action
  const handleSuspend = async (userId) => {
    if (!confirm('Are you sure you want to suspend this user account? This action will permanently remove their access credentials.')) return
    setSuspending(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        toast.success('User suspended successfully')
        setUsers(prev => prev.filter(u => u.id !== userId))
        setInspecting(false)
        setSelectedUser(null)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to suspend user')
      }
    } catch (e) {
      toast.error('Failed to suspend user')
    } finally {
      setSuspending(false)
    }
  }

  const handleInspect = (user) => {
    setSelectedUser(user)
    setInspecting(true)
  }

  // 1. Compute category counts
  const counts = useMemo(() => {
    const res = { all: users.length, driver: 0, mechanic: 0, admin: 0 }
    users.forEach((u) => {
      if (u.role === 'driver') res.driver++
      else if (u.role === 'mechanic') res.mechanic++
      else if (u.role === 'admin') res.admin++
    })
    return res
  }, [users])

  // 2. Filter, search, and sort users list
  const filteredUsers = useMemo(() => {
    let list = [...users]

    // Segmented tab role filtering
    if (activeTab !== 'all') {
      list = list.filter(u => u.role === activeTab)
    }

    // Account status filtering
    if (statusFilter !== 'all') {
      list = list.filter((u) => {
        const isUserActive = u.is_active !== false
        const isPendingVerification = u.role === 'mechanic' && (
          u.mechanic_profile?.verification_status === 'pending'
        )

        if (statusFilter === 'active') {
          if (u.role === 'mechanic') {
            return isUserActive && u.mechanic_profile?.verification_status === 'approved'
          }
          return isUserActive
        }
        if (statusFilter === 'pending') {
          return isPendingVerification
        }
        if (statusFilter === 'suspended') {
          return !isUserActive
        }
        return true
      })
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((u) => {
        return (
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
        )
      })
    }

    // Sort list
    list.sort((a, b) => {
      if (sortOption === 'name_asc') {
        return (a.full_name || '').localeCompare(b.full_name || '')
      }
      if (sortOption === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }
      if (sortOption === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      }
      return 0
    })

    return list
  }, [users, activeTab, statusFilter, searchQuery, sortOption])

  // 3. Paginated list subset
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredUsers, currentPage])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, activeTab, sortOption])

  // Dynamic contextual summary wording
  const getResultSummary = () => {
    const count = filteredUsers.length
    let roleText = 'user account'
    if (activeTab === 'driver') roleText = 'driver account'
    else if (activeTab === 'mechanic') roleText = 'mechanic account'
    else if (activeTab === 'admin') roleText = 'admin account'

    if (count !== 1) {
      roleText += 's'
    }

    if (searchQuery.trim()) {
      return `${count} ${roleText} matching “${searchQuery.trim()}”`
    }
    return `${count} ${roleText}`
  }

  // Helper for rendering custom badges
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'driver':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700 uppercase tracking-wider shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Driver
          </span>
        )
      case 'mechanic':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 uppercase tracking-wider shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Mechanic
          </span>
        )
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 border border-purple-200 text-purple-700 uppercase tracking-wider shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
            Admin
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 border border-slate-300 text-slate-700 uppercase tracking-wider shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {role}
          </span>
        )
    }
  }

  return (
    <PageWrapper 
      title="Identity Framework" 
      description="Track structural platform accounts, manage core user access classifications, and inspect role parameters."
    >
      <div className="mx-auto flex flex-col w-full max-w-7xl pb-12">
        
        {/* ================= SECTION 1: SEGMENTED ROLE TABS & COUNT METRICS ================= */}
        <div 
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6"
          role="tablist"
          aria-label="Filter user accounts by role"
        >
          {[
            { id: 'all', label: 'All Users', count: counts.all },
            { id: 'driver', label: 'Drivers', count: counts.driver },
            { id: 'mechanic', label: 'Mechanics', count: counts.mechanic },
            { id: 'admin', label: 'Admins', count: counts.admin },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id)
                  setInspecting(false)
                }}
                className={`group relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 ${
                  isActive 
                    ? 'border-amber-400 bg-amber-50/40 shadow-sm ring-1 ring-amber-400/40' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 hover:shadow'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${
                    isActive ? 'text-amber-900' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    {tab.label}
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-md tracking-wider uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-slate-200 transition-colors" />
                  )}
                </div>
                <span className="text-2xl font-black text-slate-900 mt-2 font-mono">
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ================= SECTION 2: SEARCH, FILTER & SORTING BAR ================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center shadow-sm">
          <div className="relative w-full md:flex-1">
            <span className="absolute left-3.5 top-3 text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by Name, Email, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all duration-200 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center shrink-0">
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all duration-200 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="pending">Pending Verification</option>
                <option value="suspended">Suspended Accounts</option>
              </select>
            </div>

            <div className="w-full sm:w-48">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all duration-200 cursor-pointer"
              >
                <option value="name_asc">Alphabetical (A-Z)</option>
                <option value="newest">Newest Registered</option>
                <option value="oldest">Oldest Registered</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= CORE GRID LAYOUT ================= */}
        <div className="flex gap-6 items-start">
          
          {/* ================= LEFT SIDE: USER REGISTRY MAIN FEED ================= */}
          <div className={`flex-1 space-y-3.5 transition-all duration-300 ${inspecting ? 'max-w-2xl hidden lg:block' : 'w-full'}`}>
            {loading ? (
              <Card className="rounded-2xl border-slate-200 bg-white py-16 flex justify-center shadow-sm">
                <Spinner />
              </Card>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 py-16 px-4 text-center max-w-md mx-auto mt-6">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3.5">
                  <Users size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Account Registries Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">No active driver, mechanic, or administrator profiles match the selected filtering parameters.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      {getResultSummary()}
                    </span>

                    {/* Active Filter Indicators */}
                    {(activeTab !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
                      <div className="flex flex-wrap items-center gap-1.5 ml-1">
                        {activeTab !== 'all' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-900 shadow-xs">
                            <span className="capitalize">{activeTab === 'driver' ? 'Drivers' : activeTab === 'mechanic' ? 'Mechanics' : 'Admins'}</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('all')}
                              className="text-amber-700 hover:text-amber-950 p-0.5 rounded hover:bg-amber-100/70 transition-colors"
                              aria-label="Remove role filter"
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </span>
                        )}
                        {statusFilter !== 'all' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-700 shadow-xs">
                            <span className="capitalize">{statusFilter === 'active' ? 'Active' : statusFilter === 'pending' ? 'Pending' : 'Suspended'}</span>
                            <button
                              type="button"
                              onClick={() => setStatusFilter('all')}
                              className="text-slate-500 hover:text-slate-800 p-0.5 rounded hover:bg-slate-200 transition-colors"
                              aria-label="Remove status filter"
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </span>
                        )}
                        {searchQuery.trim() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-700 shadow-xs">
                            <span className="max-w-[120px] truncate">“{searchQuery.trim()}”</span>
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="text-slate-500 hover:text-slate-800 p-0.5 rounded hover:bg-slate-200 transition-colors"
                              aria-label="Clear search filter"
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      Page {currentPage} of {totalPages}
                    </span>
                  )}
                </div>
                <div className="space-y-3.5">
                  {paginatedUsers.map((user) => (
                    <Card 
                      key={user.id} 
                      className={`rounded-2xl border transition-all p-5 shadow-sm ${
                        selectedUser?.id === user.id && inspecting 
                          ? 'border-slate-900 bg-slate-50 shadow-md ring-1 ring-slate-900' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-black text-slate-900 tracking-tight truncate">
                              {user.full_name || 'Unnamed System Member'}
                            </p>
                            {user.is_active === false && (
                              <span className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-200 text-[10px] font-bold text-red-600 px-1.5 py-0.5 uppercase tracking-wide animate-pulse">
                                Suspended
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium space-y-0.5">
                            <p className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400 shrink-0" /> {user.email}</p>
                            <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400 shrink-0" /> {user.phone || 'Phone not set'}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-slate-50 pt-3 sm:border-0 sm:pt-0 shrink-0">
                          {renderRoleBadge(user.role)}
                          <Button 
                            variant="outline" 
                            onClick={() => handleInspect(user)}
                            className="h-9 px-4 rounded-xl font-bold uppercase tracking-wider text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm"
                          >
                            Inspect
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* PAGINATION CONTROL COMPONENT */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-10 w-10 flex items-center justify-center border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-10 w-10 flex items-center justify-center border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ================= RIGHT SIDE: EXPANDABLE SPECIFIC ROLE DEEP INSPECTION SIDEBAR ================= */}
          {inspecting && selectedUser && (
            <div className="w-full lg:w-[420px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-200 sticky top-24 self-start">
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-md relative overflow-hidden">
                
                {/* Close Button */}
                <button 
                  onClick={() => setInspecting(false)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform p-1 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>

                {/* Inspection Header */}
                <div className="border-b border-slate-100 pb-5 mb-5 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Info size={14} /> Profile Inspection Matrix
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedUser.full_name || 'Member Log'}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">UID: <span className="font-mono text-[11px]">{selectedUser.id}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {renderRoleBadge(selectedUser.role)}
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200/60 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {selectedUser.is_active !== false ? (
                        <>
                          <CheckCircle size={10} className="text-emerald-500" />
                          Active
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={10} className="text-red-500" />
                          Suspended
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Role Inspection Information Fields */}
                <div className="space-y-5">
                  
                  {/* Core Contact Matrix */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Contact Validation</span>
                    <div className="rounded-xl border border-slate-50 bg-slate-50/40 p-3.5 space-y-2 text-xs font-medium text-slate-700">
                      <p className="flex items-center gap-2 truncate"><Mail size={13} className="text-slate-400" /> {selectedUser.email}</p>
                      <p className="flex items-center gap-2"><Phone size={13} className="text-slate-400" /> {selectedUser.phone || 'No direct phone data'}</p>
                      <p className="flex items-center gap-2"><Calendar size={13} className="text-slate-400" /> Registered: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Mechanic deep details pane */}
                  {selectedUser.role === 'mechanic' && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block flex items-center gap-1">
                        <Wrench size={12} /> Technical Operator Parameters
                      </span>
                      <div className="space-y-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Affiliated Garage Workshop</span>
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 mt-1">
                            {selectedUser.mechanic_profile?.business_name || 'Independent Specialist Fleet'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Vetting Score</span>
                            <p className="text-sm font-black text-slate-800 mt-0.5 flex items-center gap-1">
                              <Star size={12} className="text-primary fill-primary" />
                              {selectedUser.mechanic_profile?.rating_avg ? Number(selectedUser.mechanic_profile.rating_avg).toFixed(1) : '5.0'}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Field Experience</span>
                            <p className="text-sm font-black text-slate-800 mt-0.5">
                              {selectedUser.mechanic_profile?.years_experience ? `${selectedUser.mechanic_profile.years_experience} Years` : '0 Years'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Active Skill Specialities</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {selectedUser.mechanic_profile?.specializations && selectedUser.mechanic_profile.specializations.length > 0 ? (
                              selectedUser.mechanic_profile.specializations.map(s => (
                                <span key={s} className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                                  {s.replace('_', ' ')}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs italic text-slate-400 pl-1">No custom skills specified</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Driver deep details pane */}
                  {selectedUser.role === 'driver' && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block flex items-center gap-1">
                        <Car size={12} /> Registered Transit Attributes
                      </span>
                      <div className="space-y-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Primary Mapped Vehicle</span>
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 mt-1 capitalize">
                            {selectedUser.driver_profile?.vehicle_make 
                              ? `${selectedUser.driver_profile.vehicle_color || ''} ${selectedUser.driver_profile.vehicle_make} ${selectedUser.driver_profile.vehicle_model || ''}`
                              : 'No baseline vehicle configured'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">License Plate Reg</span>
                            <p className="text-xs font-mono font-black text-slate-800 mt-0.5 uppercase">
                              {selectedUser.driver_profile?.vehicle_plate || '—'}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Emergency Contact</span>
                            <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                              {selectedUser.driver_profile?.emergency_contact_phone || 'None linked'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suspension Action Button */}
                  {selectedUser.role !== 'admin' && selectedUser.is_active !== false && (
                    <div className="border-t border-slate-100 pt-5 mt-4">
                      <Button
                        variant="danger"
                        disabled={suspending}
                        onClick={() => handleSuspend(selectedUser.id)}
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold tracking-wider uppercase"
                      >
                        <ShieldAlert size={16} />
                        {suspending ? 'Suspending...' : 'Suspend User Account'}
                      </Button>
                    </div>
                  )}

                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </PageWrapper>
  )
}