'use client'

import { useEffect, useState, Fragment } from 'react'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Star,
  Wrench,
  Download,
  ShieldCheck,
  AlertTriangle,
  UserX,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  History,
  Unlock,
  MessageSquare,
  Trash2,
  CheckSquare,
  Layers,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react'
import { BRAND_COLORS } from '@/lib/theme'

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('analytics') // 'analytics' | 'reports' | 'moderation' | 'audit'
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(7)
  const [stats, setStats] = useState(null)

  // Itemized Incident Reports state
  const [reports, setReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportSearch, setReportSearch] = useState('')
  const [reportFilterReason, setReportFilterReason] = useState('all')
  const [selectedReportIds, setSelectedReportIds] = useState([])
  const [deleteModalData, setDeleteModalData] = useState(null) // { ids: string[], isBulk: boolean }
  const [deletingReports, setDeletingReports] = useState(false)
  const [repeatPairsOnly, setRepeatPairsOnly] = useState(false)
  const [hasExported, setHasExported] = useState(false)
  const [expandedPairs, setExpandedPairs] = useState({}) // { [pairKey]: boolean }

  // Moderation state
  const [moderatedUsers, setModeratedUsers] = useState([])
  const [moderationLogs, setModerationLogs] = useState([])
  const [loadingModeration, setLoadingModeration] = useState(false)
  const [modSearch, setModSearch] = useState('')

  // Unsuspend Modal state
  const [unsuspendModalUser, setUnsuspendModalUser] = useState(null)
  const [unsuspendReason, setUnsuspendReason] = useState('')
  const [submittingUnsuspend, setSubmittingUnsuspend] = useState(false)

  // 1. Fetch live system stats
  async function loadLiveSystemAnalytics() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stats')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retrieve system operational reports')
      }

      setStats(result.stats)
    } catch (err) {
      console.error('[REPORTS PAGE SYNC FAULT]:', err)
      toast.error(err.message || 'Error pulling live data panels')
    } finally {
      setLoading(false)
    }
  }

  // 2. Fetch itemized incident reports
  async function loadIncidentReports() {
    try {
      setLoadingReports(true)
      const response = await fetch('/api/reports')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retrieve incident reports')
      }

      setReports(result.reports || [])
    } catch (err) {
      console.error('[INCIDENT REPORTS FETCH ERROR]:', err)
      toast.error(err.message || 'Failed to load incident reports')
    } finally {
      setLoadingReports(false)
    }
  }

  // 3. Fetch moderated users and moderation audit logs
  async function loadModerationData() {
    try {
      setLoadingModeration(true)
      const response = await fetch('/api/admin/moderation')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retrieve moderation data')
      }

      setModeratedUsers(result.profiles || [])
      setModerationLogs(result.logs || [])
    } catch (err) {
      console.error('[MODERATION DATA FETCH ERROR]:', err)
      toast.error(err.message || 'Failed to load moderation data')
    } finally {
      setLoadingModeration(false)
    }
  }

  useEffect(() => {
    loadLiveSystemAnalytics()
    loadIncidentReports()
    loadModerationData()
  }, [timeRange])

  // Handle Unsuspend submit
  const handleUnsuspendSubmit = async (e) => {
    e.preventDefault()
    if (!unsuspendModalUser) return
    if (!unsuspendReason.trim()) {
      toast.error('A reason for unsuspending is required.')
      return
    }

    try {
      setSubmittingUnsuspend(true)
      const res = await fetch('/api/admin/moderation/unsuspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: unsuspendModalUser.id,
          reason: unsuspendReason.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unsuspend account')
      }

      toast.success(data.message || 'Account unsuspended successfully!')
      setUnsuspendModalUser(null)
      setUnsuspendReason('')
      // Refresh moderation records
      loadModerationData()
    } catch (err) {
      console.error('[UNSUSPEND ACTION FAULT]:', err)
      toast.error(err.message || 'Failed to execute unsuspend action')
    } finally {
      setSubmittingUnsuspend(false)
    }
  }

  // CSV Export for Operational Summary
  const handleExportReport = () => {
    try {
      if (!stats) {
        toast.error('No analytics data available for export')
        return
      }

      let csvContent = "data:text/csv;charset=utf-8,"
      csvContent += "RoadRescue Operations Summary Report 2026\n"
      csvContent += `Generated At,${new Date().toISOString()}\n\n`
      
      csvContent += "Core Metrics,Value\n"
      csvContent += `Total Incidents Logged,${stats.totalRequests || 0}\n`
      csvContent += `Actively Ongoing,${stats.activeRequests || 0}\n`
      csvContent += `Avg Dispatch Response Time (min),${stats.avgResponseTime || 0}\n`
      csvContent += `Active Operators On-Duty,${stats.activeMechanics || 0}\n`
      csvContent += `System CSAT Rating,${stats.avgRating || 5.0}\n\n`

      if (stats.statusBreakdown && stats.statusBreakdown.length > 0) {
        csvContent += "Status Distribution,Count\n"
        stats.statusBreakdown.forEach(item => {
          csvContent += `${item.status.toUpperCase()},${item.count || 0}\n`
        })
        csvContent += "\n"
      }

      if (stats.serviceTypeBreakdown && stats.serviceTypeBreakdown.length > 0) {
        csvContent += "Service Callout Category,Count\n"
        stats.serviceTypeBreakdown.forEach(item => {
          csvContent += `${item.service_type.toUpperCase()},${item.count || 0}\n`
        })
      }

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `roadrescue_ops_report_2026.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Operations summary exported successfully!')
    } catch (err) {
      console.error('[EXPORT FAULT]:', err)
      toast.error('Failed to export operational statistics')
    }
  }

  // CSV Export for Incident Reports (exports full active dataset matching search/filters)
  const handleExportIncidentReports = () => {
    try {
      if (!filteredReports || filteredReports.length === 0) {
        toast.error('No incident reports matching active filters to export')
        return
      }

      let csv = "data:text/csv;charset=utf-8,"
      csv += "Report ID,Request ID,Date,Reporter Name,Reporter Role,Reported Party,Reported Role,Category,Comment,Status,Conflict Flags Between Pair\n"
      
      filteredReports.forEach(r => {
        const repName = (r.reporter?.full_name || 'Anonymous').replace(/"/g, '""')
        const repRole = (r.reporter?.role || 'User').replace(/"/g, '""')
        const reportedName = (r.reported_user?.full_name || 'System Target').replace(/"/g, '""')
        const reportedRole = (r.reported_user?.role || 'N/A').replace(/"/g, '""')
        const category = (r.reason_header || r.reason || 'other').replace(/_/g, ' ')
        const comment = (r.comment || '').replace(/"/g, '""').replace(/\n/g, ' ')
        const status = r.request?.status || 'N/A'
        const pairKey = `${r.reporter_id || 'anon'}_${r.reported_user_id || 'system'}`
        const conflictCount = pairConflictCounts[pairKey] || 1

        csv += `"${r.id}","${r.request_id || ''}","${new Date(r.created_at).toLocaleString()}","${repName}","${repRole}","${reportedName}","${reportedRole}","${category}","${comment}","${status}","${conflictCount}"\n`
      })

      const encoded = encodeURI(csv)
      const link = document.createElement("a")
      link.setAttribute("href", encoded)
      link.setAttribute("download", `roadrescue_incident_reports_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setHasExported(true)
      toast.success(`Exported ${filteredReports.length} incident reports to CSV!`)
    } catch (err) {
      console.error('[EXPORT FAULT]:', err)
      toast.error('Failed to export incident reports')
    }
  }

  // Handle Bulk / Single Delete submission
  const handleDeleteReportsSubmit = async () => {
    if (!deleteModalData || !deleteModalData.ids || deleteModalData.ids.length === 0) return

    try {
      setDeletingReports(true)
      const res = await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteModalData.ids }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Failed to delete incident reports')
      }

      // Update local state to immediately remove deleted rows
      const deletedSet = new Set(deleteModalData.ids)
      setReports(prev => prev.filter(r => !deletedSet.has(r.id)))
      setSelectedReportIds(prev => prev.filter(id => !deletedSet.has(id)))
      
      toast.success(
        deleteModalData.ids.length === 1
          ? 'Incident report deleted successfully.'
          : `Successfully deleted ${deleteModalData.ids.length} incident reports.`
      )
      setDeleteModalData(null)
    } catch (err) {
      console.error('[DELETE REPORTS FAULT]:', err)
      toast.error(err.message || 'Failed to delete report records')
    } finally {
      setDeletingReports(false)
    }
  }

  // Row selection helpers
  const handleToggleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length && filteredReports.length > 0) {
      setSelectedReportIds([])
    } else {
      setSelectedReportIds(filteredReports.map(r => r.id))
    }
  }

  const handleToggleSelectRow = (id) => {
    setSelectedReportIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  if (loading && !stats) {
    return (
      <PageWrapper title="Operational Analytics & Moderation">
        <div className="flex justify-center py-24"><Spinner /></div>
      </PageWrapper>
    )
  }

  // Data transformations for charts
  const totalIncidents = stats?.totalRequests || 0
  const findCountByService = (type) => stats?.serviceTypeBreakdown?.find(s => s.service_type === type)?.count || 0

  const categoriesPercentages = {
    engine: totalIncidents > 0 ? Math.round((findCountByService('engine_repair') / totalIncidents) * 100) : 0,
    tire: totalIncidents > 0 ? Math.round((findCountByService('flat_tire') / totalIncidents) * 100) : 0,
    electrical: totalIncidents > 0 ? Math.round((findCountByService('battery_jump') / totalIncidents) * 100) : 0,
    other: totalIncidents > 0 ? Math.round((findCountByService('other') / totalIncidents) * 100) : 0,
  }

  const totalMechanicalPercentage = Math.min(categoriesPercentages.engine + categoriesPercentages.other, 100)
  const totalVolume = stats?.statusBreakdown?.reduce((sum, item) => sum + (item.count || 0), 0) || 0

  const getNormalizedServiceLabel = (type) => {
    const lower = type?.toLowerCase() || ''
    if (lower.includes('repair')) return 'General Repair'
    if (lower.includes('tow')) return 'Towing & Recovery'
    if (lower.includes('tyre') || lower.includes('tire')) return 'Tyre Change'
    if (lower.includes('battery') || lower.includes('jump')) return 'Battery Jump'
    if (lower.includes('fuel')) return 'Fuel Delivery'
    return 'Other Assistance'
  }

  const aggregatedServices = {}
  stats?.serviceTypeBreakdown?.forEach(item => {
    const label = getNormalizedServiceLabel(item.service_type)
    aggregatedServices[label] = (aggregatedServices[label] || 0) + item.count
  })
  
  const allLabels = ['General Repair', 'Towing & Recovery', 'Tyre Change', 'Battery Jump', 'Fuel Delivery', 'Other Assistance']
  const colorPalette = [
    BRAND_COLORS.primary,
    '#334155',
    '#3b82f6',
    '#10b981',
    '#f43f5e',
    '#94a3b8'
  ]

  const chartData = allLabels.map((label, idx) => ({
    label,
    count: aggregatedServices[label] || 0,
    color: colorPalette[idx]
  })).filter(d => d.count > 0)

  const totalChartCount = chartData.reduce((sum, d) => sum + d.count, 0)
  const RADIUS = 70
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  let accumulatedPercent = 0

  // Driver-Mechanic Conflict Pair Flag Map (group by reporter_id + reported_user_id)
  const pairConflictCounts = {}
  reports.forEach(r => {
    const pKey = `${r.reporter_id || 'anon'}_${r.reported_user_id || 'system'}`
    pairConflictCounts[pKey] = (pairConflictCounts[pKey] || 0) + 1
  })

  // Filtered Incident Reports
  const filteredReports = reports.filter(r => {
    const matchesSearch =
      reportSearch === '' ||
      r.id.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.request_id?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.reporter?.full_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.reported_user?.full_name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.comment?.toLowerCase().includes(reportSearch.toLowerCase())

    const matchesReason =
      reportFilterReason === 'all' ||
      (r.reason_header || r.reason) === reportFilterReason

    const pairKey = `${r.reporter_id || 'anon'}_${r.reported_user_id || 'system'}`
    const matchesRepeat = !repeatPairsOnly || (pairConflictCounts[pairKey] > 1)

    return matchesSearch && matchesReason && matchesRepeat
  })

  // Group filtered reports by unique (reporter + reported_user) pair
  const groupedReportsMap = {}
  filteredReports.forEach(r => {
    const pairKey = `${r.reporter_id || 'anon'}_${r.reported_user_id || 'system'}`
    if (!groupedReportsMap[pairKey]) {
      groupedReportsMap[pairKey] = {
        pairKey,
        reporter: r.reporter,
        reporter_id: r.reporter_id,
        reported_user: r.reported_user,
        reported_user_id: r.reported_user_id,
        reports: [],
      }
    }
    groupedReportsMap[pairKey].reports.push(r)
  })

  const groupedReports = Object.values(groupedReportsMap).sort((a, b) => {
    // Sort repeat dispute groups first, then by most recent report
    if (b.reports.length !== a.reports.length) {
      return b.reports.length - a.reports.length
    }
    const dateA = new Date(a.reports[0]?.created_at || 0).getTime()
    const dateB = new Date(b.reports[0]?.created_at || 0).getTime()
    return dateB - dateA
  })

  const togglePairExpand = (pairKey) => {
    setExpandedPairs(prev => ({
      ...prev,
      [pairKey]: !prev[pairKey]
    }))
  }

  // Filtered Moderated Accounts
  const filteredModeratedUsers = moderatedUsers.filter(u => {
    if (!modSearch) return true
    const term = modSearch.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.id?.toLowerCase().includes(term) ||
      u.suspension_reason?.toLowerCase().includes(term)
    )
  })

  return (
    <PageWrapper 
      title="Reports & Moderation Console" 
      description="Operational distribution, itemized incident reports, and automated account moderation guardrails."
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
        
        {/* ================= TABS NAVIGATION HEADER ================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BarChart3 size={14} /> Analytics & Ops
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText size={14} /> Incident Reports
              {reports.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {reports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'moderation'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldAlert size={14} /> Moderation & Flags
              {moderatedUsers.filter(u => u.is_suspended || u.is_flagged).length > 0 && (
                <span className="ml-1 bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {moderatedUsers.filter(u => u.is_suspended || u.is_flagged).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'audit'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <History size={14} /> Moderation Log
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'analytics' && (
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
              >
                <Download size={14} /> Export Ops Summary
              </button>
            )}

            {activeTab === 'reports' && (
              <button
                onClick={handleExportIncidentReports}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
              >
                <Download size={14} /> Export CSV
              </button>
            )}

            <button
              onClick={() => {
                loadLiveSystemAnalytics()
                loadIncidentReports()
                loadModerationData()
                toast.success('Refreshed reports & moderation feeds')
              }}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-xs"
              title="Refresh all data"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ================= TAB 1: OPERATIONAL ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* High Level Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Incidents Logged</span>
                  <BarChart3 size={16} className="text-slate-400" />
                </div>
                <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{stats?.totalRequests || 0}</p>
                <p className="mt-1 text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp size={12} /> +{stats?.activeRequests || 0} actively ongoing
                </p>
              </Card>

              <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg Dispatch Response</span>
                  <Clock size={16} className="text-slate-400" />
                </div>
                <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{stats?.avgResponseTime || '0'}m</p>
                <p className="mt-1 text-xs font-medium text-slate-400">From creation ticket to match</p>
              </Card>

              <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Operators</span>
                  <Users size={16} className="text-slate-400" />
                </div>
                <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{stats?.activeMechanics || 0}</p>
                <p className="mt-1 text-xs font-bold text-emerald-600">Mechanics toggled live on-duty</p>
              </Card>

              <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System CSAT Score</span>
                  <Star size={16} className="text-primary fill-primary" />
                </div>
                <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{stats?.avgRating || '5.0'} <span className="text-sm font-bold text-slate-400">/ 5.0</span></p>
                <p className="mt-1 text-xs font-bold text-amber-600 tracking-wider">Verified transaction reviews</p>
              </Card>
            </div>

            {/* Ranked Category Distribution & Diagnostics */}
            <div className="grid gap-6 lg:grid-cols-[1.9fr_0.9fr]">
              {/* Ranked Category Distribution Bar */}
              <Card className="rounded-2xl border border-slate-100 bg-white p-0 overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-slate-400" /> Incident Categories Distribution
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 font-mono">{totalChartCount} Total Logged</span>
                    <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded uppercase tracking-wider">Live Breakdown</span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-center">
                  {totalChartCount === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-xs font-medium text-slate-400 py-12">
                      No active incidents recorded across service type categories.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chartData
                        .slice()
                        .sort((a, b) => b.count - a.count)
                        .map((item, idx) => {
                          const percent = Math.round((item.count / totalChartCount) * 100)
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span 
                                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs" 
                                    style={{ backgroundColor: item.color }} 
                                  />
                                  <span className="text-slate-800 font-bold truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 pl-2 font-mono text-slate-900 font-bold">
                                  <span>{item.count}</span>
                                  <span className="text-slate-400 font-medium text-[11px]">({percent}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500 ease-out"
                                  style={{ 
                                    width: `${percent}%`, 
                                    backgroundColor: item.color 
                                  }} 
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </Card>

              {/* Diagnostic Breakdown */}
              <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-5">
                    <Wrench size={14} /> Diagnostic Breakdown
                  </h3>
                  
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                    <p className="text-4xl font-black text-slate-900 tracking-tight">{totalMechanicalPercentage}%</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Mechanical Incidents Ratio</p>
                  </div>

                  <div className="mt-6 space-y-4 text-xs font-semibold text-slate-700">
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Engine Diagnostics</span><span className="text-slate-900">{categoriesPercentages.engine}%</span></div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${categoriesPercentages.engine}%` }} />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Tire Maintenance</span><span className="text-slate-900">{categoriesPercentages.tire}%</span></div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-700 h-full rounded-full transition-all duration-500" style={{ width: `${categoriesPercentages.tire}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Electrical / Battery</span><span className="text-slate-900">{categoriesPercentages.electrical}%</span></div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${categoriesPercentages.electrical}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Other Callouts</span><span className="text-slate-900">{categoriesPercentages.other}%</span></div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-200 h-full rounded-full transition-all duration-500" style={{ width: `${categoriesPercentages.other}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Operational Distribution & Regulatory Compliance */}
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] w-full">
              <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Operational Distribution Load</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Live tracking counts grouped by active workflow nodes</p>
                  </div>
                  <div className="flex gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                    <button 
                      onClick={() => setTimeRange(7)} 
                      className={`rounded-lg px-3 py-1 border transition-all ${timeRange === 7 ? 'bg-primary border-primary text-slate-900 font-extrabold shadow-sm' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      7 Days View
                    </button>
                    <button 
                      onClick={() => setTimeRange(30)} 
                      className={`rounded-lg px-3 py-1 border transition-all ${timeRange === 30 ? 'bg-primary border-primary text-slate-900 font-extrabold shadow-sm' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      30 Days View
                    </button>
                  </div>
                </div>

                <div className="min-h-[14rem] rounded-xl border border-slate-100 bg-slate-50/50 p-6 flex flex-col justify-center gap-4 relative">
                  {(!stats?.statusBreakdown || stats.statusBreakdown.length === 0) ? (
                    <div className="text-center text-xs font-medium text-slate-400 py-12">No active lifecycle transitions logged in current database matrix.</div>
                  ) : (
                    stats.statusBreakdown.map((item) => {
                      const barPercentage = totalVolume > 0 ? Math.min(Math.round((item.count / totalVolume) * 100), 100) : 5
                      return (
                        <div key={item.status} className="w-full flex items-center gap-4 text-xs font-bold">
                          <span className="w-24 text-slate-500 font-mono uppercase text-[10px] tracking-wider text-left">{item.status}</span>
                          <div className="flex-1 bg-slate-100 h-5 rounded-md overflow-hidden relative shadow-inner">
                            <div 
                              className="bg-slate-900 h-full rounded-md transition-all duration-700 ease-out flex items-center justify-end px-2"
                              style={{ width: `${barPercentage}%` }}
                            >
                              {barPercentage > 10 && <span className="text-[10px] font-black text-white">{barPercentage}%</span>}
                            </div>
                          </div>
                          <span className="w-12 text-right text-slate-900 font-black">{item.count} open</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>

              <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Regulatory Compliance Pipelines</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Upcoming integration gateways for national transport agencies</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 overflow-hidden">
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded shadow-sm">
                          Compliance Lock
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600 h-fit">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800">DVLA Verification Gateway</h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Automated real-time vehicle validation mapping license plate and chassis numbers against the national Driver and Vehicle Licensing Authority registry.
                          </p>
                          <div className="mt-3 flex items-center gap-1 text-[10px] font-mono text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            API Endpoint: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-500">/api/compliance/dvla/verify</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 overflow-hidden">
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded shadow-sm">
                          Future Pipeline
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500 h-fit">
                          <BarChart3 size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800">NSRA Accident Analytics</h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Direct transmission of anonymous operational breakdown incident logs to the National Road Safety Authority portal for traffic and safety studies.
                          </p>
                          <div className="mt-3 flex items-center gap-1 text-[10px] font-mono text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            Webhook Destination: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-500">nsra-portal.gov.gh/ingest</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ITEMIZED INCIDENT REPORTS ================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <Card className="p-4 rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder="Search by ID, reporter, comment..."
                      className="w-full pl-10 pr-4 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 placeholder:text-neutral-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-neutral-400 shrink-0" />
                    <select
                      value={reportFilterReason}
                      onChange={(e) => setReportFilterReason(e.target.value)}
                      className="text-xs font-medium border border-neutral-200 rounded-xl px-3 py-2 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    >
                      <option value="all">All Incident Categories</option>
                      <option value="inappropriate_behavior">Inappropriate Behavior</option>
                      <option value="pricing_issue">Pricing Issue</option>
                      <option value="delay">Excessive Delay</option>
                      <option value="other">Other Incident</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setRepeatPairsOnly(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                      repeatPairsOnly
                        ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                    title="Filter to show only driver-mechanic pairs with multiple filed disputes"
                  >
                    <Layers size={14} />
                    <span>Repeat Conflicts Only</span>
                  </button>
                </div>
              </div>
            </Card>

            {/* Compact Floating Selection Action Bar */}
            {selectedReportIds.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-neutral-900 text-white rounded-xl shadow-md animate-in fade-in duration-150 border border-neutral-800">
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 font-bold text-neutral-950 text-[11px]">
                    {selectedReportIds.length}
                  </span>
                  <span className="font-medium">
                    {selectedReportIds.length === 1 ? '1 report selected' : `${selectedReportIds.length} reports selected`}
                  </span>
                  <button
                    onClick={() => setSelectedReportIds([])}
                    className="text-xs text-neutral-400 hover:text-white underline underline-offset-2 ml-2 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalData({
                      ids: selectedReportIds,
                      isBulk: true,
                    })
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Trash2 size={13} />
                  Delete Selected ({selectedReportIds.length})
                </button>
              </div>
            )}

            {/* Grouped Expandable Incident Table */}
            <Card className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-xs p-0">
              <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                    Incident Reports & Conflict Clusters ({filteredReports.length} records in {groupedReports.length} pairs)
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Grouped by driver-mechanic dispute pairs. Expand any group to inspect individual filed reports.
                  </p>
                </div>
                {repeatPairsOnly && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                    Repeat conflict filter active
                  </span>
                )}
              </div>

              {loadingReports ? (
                <div className="flex justify-center py-16"><Spinner /></div>
              ) : groupedReports.length === 0 ? (
                <div className="text-center py-16 text-xs text-neutral-400">
                  <FileText size={32} className="mx-auto text-neutral-300 mb-2" />
                  No incident reports match the current criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-600">
                    <thead className="bg-neutral-50/80 text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200/70">
                      <tr>
                        <th className="px-4 py-3.5 w-10">
                          <input
                            type="checkbox"
                            checked={filteredReports.length > 0 && selectedReportIds.length === filteredReports.length}
                            onChange={handleToggleSelectAll}
                            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                            aria-label="Select all reports"
                          />
                        </th>
                        <th className="px-4 py-3.5 w-12 text-center">Group</th>
                        <th className="px-4 py-3.5">Filed By (Driver)</th>
                        <th className="px-4 py-3.5">Reported Party (Mechanic)</th>
                        <th className="px-4 py-3.5">Conflict Activity</th>
                        <th className="px-4 py-3.5">Latest Category / Summary</th>
                        <th className="px-4 py-3.5">Latest Record</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 bg-white">
                      {groupedReports.map((group) => {
                        const isExpanded = !!expandedPairs[group.pairKey]
                        const reportCount = group.reports.length
                        const isRepeat = reportCount > 1
                        const latestReport = group.reports[0] || {}
                        const groupSelectedCount = group.reports.filter(r => selectedReportIds.includes(r.id)).length
                        const isAllGroupSelected = groupSelectedCount === group.reports.length && reportCount > 0

                        return (
                          <Fragment key={group.pairKey}>
                            {/* MASTER SUMMARY ROW */}
                            <tr
                              className={`transition-colors cursor-pointer ${
                                isAllGroupSelected
                                  ? 'bg-amber-50/30'
                                  : isRepeat
                                  ? 'bg-neutral-50/60 hover:bg-neutral-100/60'
                                  : 'hover:bg-neutral-50/50'
                              }`}
                              onClick={() => togglePairExpand(group.pairKey)}
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isAllGroupSelected}
                                  onChange={() => {
                                    if (isAllGroupSelected) {
                                      const groupIds = new Set(group.reports.map(r => r.id))
                                      setSelectedReportIds(prev => prev.filter(id => !groupIds.has(id)))
                                    } else {
                                      const groupIds = group.reports.map(r => r.id)
                                      setSelectedReportIds(prev => Array.from(new Set([...prev, ...groupIds])))
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                                  aria-label={`Select all reports for group`}
                                />
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap align-middle text-center text-neutral-400">
                                <span className="inline-flex p-1 rounded-md hover:bg-neutral-200/60 text-neutral-500 transition">
                                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap align-middle">
                                <div className="text-sm font-medium text-neutral-900">
                                  {group.reporter?.full_name || 'Anonymous User'}
                                </div>
                                <div className="text-xs text-neutral-500 capitalize">
                                  {group.reporter?.role || 'Driver'}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap align-middle">
                                <div className="text-sm font-medium text-neutral-900">
                                  {group.reported_user?.full_name || 'System Target'}
                                </div>
                                <div className="text-xs text-neutral-500 capitalize">
                                  {group.reported_user?.role || 'Target'}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap align-middle">
                                {isRepeat ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                                    <AlertTriangle size={11} className="text-amber-600" />
                                    {reportCount} Reports
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                                    1 Report
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 max-w-xs align-middle">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize bg-neutral-100 text-neutral-700 border border-neutral-200/60 shrink-0">
                                    {(latestReport.reason_header || latestReport.reason || 'other').replace('_', ' ')}
                                  </span>
                                  <span className="text-xs text-neutral-500 truncate">
                                    {latestReport.comment || 'No comment provided'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-xs text-neutral-500 font-mono align-middle">
                                {new Date(latestReport.created_at).toLocaleString()}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => togglePairExpand(group.pairKey)}
                                    className="px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/70 rounded-lg transition"
                                  >
                                    {isExpanded ? 'Collapse' : `View (${reportCount})`}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* EXPANDED NESTED SUB-ROWS */}
                            {isExpanded && (
                              <tr className="bg-neutral-50/40 border-b border-neutral-200/60">
                                <td colSpan={8} className="p-0">
                                  <div className="py-2.5 px-6 space-y-2 border-l-2 border-amber-400/80 ml-6 my-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                                      Dispute Details between {group.reporter?.full_name || 'Driver'} & {group.reported_user?.full_name || 'Mechanic'} ({reportCount} total records)
                                    </div>

                                    <div className="rounded-xl border border-neutral-200/70 bg-white overflow-hidden shadow-2xs divide-y divide-neutral-100">
                                      {group.reports.map((r) => {
                                        const isRowSelected = selectedReportIds.includes(r.id)
                                        const reasonVal = r.reason_header || r.reason || 'other'
                                        
                                        return (
                                          <div
                                            key={r.id}
                                            className={`p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition ${
                                              isRowSelected ? 'bg-amber-50/40' : 'hover:bg-neutral-50/60'
                                            }`}
                                          >
                                            <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                                              <input
                                                type="checkbox"
                                                checked={isRowSelected}
                                                onChange={() => handleToggleSelectRow(r.id)}
                                                className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 mt-0.5 md:mt-0 cursor-pointer"
                                              />
                                              
                                              <div className="space-y-0.5 min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="font-mono text-xs font-semibold text-neutral-900">
                                                    #{r.id.slice(0, 8)}
                                                  </span>
                                                  <span className="text-neutral-400">·</span>
                                                  <span className="text-neutral-500 font-mono text-[11px]">
                                                    Req: #{r.request_id?.slice(0, 8)}
                                                  </span>
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                                                    {reasonVal.replace('_', ' ')}
                                                  </span>
                                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-neutral-100 text-neutral-600 border border-neutral-200/50">
                                                    {r.request?.status || 'N/A'}
                                                  </span>
                                                </div>
                                                <p className="text-neutral-700 text-xs leading-relaxed pt-0.5">
                                                  {r.comment || 'No comment provided'}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-neutral-100">
                                              <span className="text-[11px] text-neutral-400 font-mono">
                                                {new Date(r.created_at).toLocaleString()}
                                              </span>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setDeleteModalData({
                                                    ids: [r.id],
                                                    isBulk: false,
                                                  })
                                                }}
                                                className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                title="Delete this incident report"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================= TAB 3: ACCOUNT MODERATION & SUSPENSIONS ================= */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            {/* Search & Overview Banner */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4 rounded-2xl border border-rose-100 bg-rose-50/50 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                    <UserX size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700">Currently Suspended</span>
                    <p className="text-2xl font-black text-rose-900">
                      {moderatedUsers.filter(u => u.is_suspended).length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 rounded-2xl border border-amber-100 bg-amber-50/50 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">Flagged Accounts</span>
                    <p className="text-2xl font-black text-amber-900">
                      {moderatedUsers.filter(u => u.is_flagged).length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Tracked Profiles</span>
                    <p className="text-2xl font-black text-slate-900">
                      {moderatedUsers.length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Moderation Search */}
            <Card className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modSearch}
                  onChange={(e) => setModSearch(e.target.value)}
                  placeholder="Search flagged or suspended users by name, email, suspension reason..."
                  className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
            </Card>

            {/* Moderated Accounts List */}
            <Card className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs p-0">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Flagged & Suspended Accounts ({filteredModeratedUsers.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Trigger-enforced threshold triggers: 3+ incident flags = Flagged; &gt;5 cancellations = Suspended
                  </p>
                </div>
              </div>

              {loadingModeration ? (
                <div className="flex justify-center py-16"><Spinner /></div>
              ) : filteredModeratedUsers.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">
                  <ShieldCheck size={32} className="mx-auto text-emerald-500 mb-2" />
                  No flagged or suspended accounts in the system.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/70">
                      <tr>
                        <th className="px-4 py-3.5">User Profile</th>
                        <th className="px-4 py-3.5">Role</th>
                        <th className="px-4 py-3.5">Issue Flag Count</th>
                        <th className="px-4 py-3.5">Cancellations</th>
                        <th className="px-4 py-3.5">Moderation Status</th>
                        <th className="px-4 py-3.5">Suspension Reason / Date</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 bg-white">
                      {filteredModeratedUsers.map((user) => {
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap align-top">
                              <div className="text-sm font-medium text-slate-900">{user.full_name || 'Unnamed User'}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{user.email || user.id}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap align-top">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize bg-slate-100 text-slate-700 border border-slate-200/60">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap align-top">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-mono font-medium ${user.issue_flag_count >= 3 ? 'text-amber-700' : 'text-slate-900'}`}>
                                  {user.issue_flag_count || 0}
                                </span>
                                {user.reports && user.reports.length > 0 && (
                                  <span className="text-xs text-slate-500">({user.reports.length} reports)</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap align-top font-mono text-sm font-medium">
                              <span className={user.cancellation_count > 5 ? 'text-rose-700' : 'text-slate-900'}>
                                {user.cancellation_count || 0}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap align-top">
                              <div className="flex flex-col gap-1">
                                {user.is_suspended ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200/60 w-fit">
                                    <UserX size={12} /> Suspended
                                  </span>
                                ) : user.is_flagged ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60 w-fit">
                                    <AlertTriangle size={12} /> Flagged
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 w-fit">
                                    <CheckCircle size={12} /> Active
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 max-w-xs align-top">
                              {user.is_suspended ? (
                                <div>
                                  <p className="text-sm text-rose-800 font-medium line-clamp-2">
                                    {user.suspension_reason || 'Administrative or automatic suspension'}
                                  </p>
                                  {user.suspended_at && (
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                                      At: {new Date(user.suspended_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right align-top">
                              {user.is_suspended ? (
                                <button
                                  onClick={() => {
                                    setUnsuspendModalUser(user)
                                    setUnsuspendReason('')
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                                >
                                  <Unlock size={12} /> Unsuspend
                                </button>
                              ) : (
                                <span className="text-xs font-medium text-slate-400">Clear</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================= TAB 4: MODERATION AUDIT TRAIL ================= */}
        {activeTab === 'audit' && (
          <Card className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs p-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Moderation Audit Log Trail ({moderationLogs.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Immutable ledger recording system threshold triggers and administrative unsuspension actions
                </p>
              </div>
            </div>

            {loadingModeration ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : moderationLogs.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400">
                <History size={32} className="mx-auto text-slate-300 mb-2" />
                No moderation log records recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/70">
                    <tr>
                      <th className="px-4 py-3.5">Timestamp</th>
                      <th className="px-4 py-3.5">Action</th>
                      <th className="px-4 py-3.5">Target Account</th>
                      <th className="px-4 py-3.5">Trigger / Reason</th>
                      <th className="px-4 py-3.5">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 bg-white">
                    {moderationLogs.map((log) => {
                      const actionBadge =
                        log.action === 'suspended' ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                        : log.action === 'unsuspended' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                        : log.action === 'flagged' ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                        : 'bg-slate-50 text-slate-700 border-slate-200/60'

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-mono text-xs align-top">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap align-top">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${actionBadge}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap align-top">
                            <div className="text-sm font-medium text-slate-900">{log.user?.full_name || 'Account'}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{log.user?.email || log.user_id}</div>
                          </td>
                          <td className="px-4 py-4 max-w-sm align-top">
                            <p className="text-sm text-slate-700 leading-relaxed font-normal">
                              {log.reason || 'No detailed reason provided'}
                            </p>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap align-top">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono bg-slate-100 text-slate-700 border border-slate-200/60">
                              {log.actor === 'system' ? 'System Trigger' : `Admin: ${log.actor.slice(0, 8)}...`}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ================= UNSUSPEND REASON MODAL ================= */}
        {unsuspendModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Unlock size={20} />
                  <h3 className="font-black text-slate-900 text-sm">Unsuspend User Account</h3>
                </div>
                <button
                  onClick={() => setUnsuspendModalUser(null)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleUnsuspendSubmit} className="mt-4 space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <div className="font-bold text-slate-900">{unsuspendModalUser.full_name}</div>
                  <div className="text-slate-500 text-[11px]">{unsuspendModalUser.email || unsuspendModalUser.id}</div>
                  <div className="mt-2 text-slate-600">
                    <span className="font-bold text-slate-700">Suspension reason: </span>
                    {unsuspendModalUser.suspension_reason || 'N/A'}
                  </div>
                  <div className="mt-1 text-slate-400 text-[10px]">
                    Note: Unsuspending restores active access. Historical counts (Flags: {unsuspendModalUser.issue_flag_count}, Cancels: {unsuspendModalUser.cancellation_count}) remain intact in audit logs.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrative Clearance Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={unsuspendReason}
                    onChange={(e) => setUnsuspendReason(e.target.value)}
                    placeholder="Enter reason for lifting suspension (e.g., identity verified, dispute resolved, false report appeal granted)..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={submittingUnsuspend}
                    onClick={() => setUnsuspendModalUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingUnsuspend}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submittingUnsuspend ? <Spinner size="sm" /> : <Unlock size={14} />}
                    Confirm Unsuspension
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= INCIDENT REPORT DELETE CONFIRMATION MODAL ================= */}
        {deleteModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <Trash2 size={20} />
                  <h3 className="font-black text-slate-900 text-sm">
                    {deleteModalData.isBulk ? `Delete ${deleteModalData.ids.length} Incident Reports` : 'Delete Incident Report'}
                  </h3>
                </div>
                <button
                  disabled={deletingReports}
                  onClick={() => setDeleteModalData(null)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3.5">
                <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Recommendation: Export data before deletion</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {hasExported
                        ? 'A CSV export was recently generated in this session. Proceeding will permanently purge the selected report record(s).'
                        : 'Make sure a CSV export has been created if you need to retain these records for compliance or audit purposes.'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-slate-900">
                    {deleteModalData.ids.length === 1 ? 'this incident report' : `${deleteModalData.ids.length} incident reports`}
                  </span>
                  ? This action cannot be undone.
                </p>

                {!hasExported && (
                  <button
                    type="button"
                    onClick={handleExportIncidentReports}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    <Download size={13} />
                    Export CSV Now Before Deleting
                  </button>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={deletingReports}
                    onClick={() => setDeleteModalData(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deletingReports}
                    onClick={handleDeleteReportsSubmit}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
                  >
                    {deletingReports ? <Spinner size="sm" /> : <Trash2 size={14} />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  )
}