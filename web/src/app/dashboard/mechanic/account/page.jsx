'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { 
  Building2, MapPin, Wrench, ShieldAlert, Award, Clock, 
  Phone, Mail, FileText, CheckCircle2, MessageSquare, Camera, Loader2,
  AlertTriangle, Star, Check, HelpCircle
} from 'lucide-react'
import Select from '@/components/ui/Select'
import { normalizeGeoPoint } from '@/lib/utils'
import { MECHANIC_SPECIALTIES } from '@/lib/constants'
import { useOnboarding } from '@/hooks/useOnboarding'
import MechanicTour from '@/components/onboarding/mechanic-tour'

export default function MechanicAccountPage() {
  const { user, profile, setProfile } = useAuth()
  const [mechanicProfile, setMechanicProfile] = useState(null)
  const [completedRescuesCount, setCompletedRescuesCount] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const userIdRef = useRef(user?.id)
  const fileInputRef = useRef(null)
  const docInputRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [pinningLocation, setPinningLocation] = useState(false)
  const [reviews, setReviews] = useState([])
  const [pendingChangeRequests, setPendingChangeRequests] = useState([])
  const { resetTour } = useOnboarding('mechanic_v1')

  // Unified application form schema state instance
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    businessName: '',
    specializations: [],
    serviceArea: '',
    serviceRadius: '',
    currentStatus: 'offline',
    yearsExperience: '',
    licenseNumber: '',
    licenseExpiry: '',
    availability: false,
    secondaryPhone: '',
    serviceMode: 'mobile',
    baseLocationLabel: '',
    showBaseLocationOffline: false,
  })

  useEffect(() => {
    userIdRef.current = user?.id
    if (!userIdRef.current) return

    let mounted = true
    async function loadFullProfile() {
      const currentUserId = userIdRef.current
      const supabase = createClient()
      
      // 1. Fetch authenticated core metadata elements
      const { data: baseProfile } = await supabase
        .from('profiles')
        .select('full_name, email, phone, avatar_url')
        .eq('id', currentUserId)
        .maybeSingle()

      // 2. Fetch specialized workplace fields using verified schema columns
      const { data: mechData } = await supabase
        .from('mechanic_profiles')
        .select('business_name, specializations, location_label, is_available, rating_avg, rating_count, years_experience, verification_status, created_at, service_mode, current_location, base_location, base_location_label, show_base_location_offline')
        .eq('user_id', currentUserId)
        .maybeSingle()

      // 3. Query secondary phone from preferences table
      let preferenceData = null
      try {
        const response = await fetch('/api/profile/preferences', { cache: 'no-store' })
        if (response.ok) {
          const payload = await response.json()
          preferenceData = payload.preferences
        }
      } catch (err) {
        console.warn('Preferences repository endpoint fallback initialized:', err)
      }

      // 4. Query completed rescues count
      const { count: completedCount, error: countErr } = await supabase
        .from('rescue_requests')
        .select('*', { count: 'exact', head: true })
        .eq('mechanic_id', currentUserId)
        .eq('status', 'completed')

      if (countErr) {
        console.warn('[COMPLETED RESCUES COUNT FETCH FAULT]:', countErr.message)
      }

      // 5. Fetch current verification documents
      const { data: docsData, error: docsErr } = await supabase
        .from('mechanic_documents')
        .select('id, document_name, file_url, created_at')
        .eq('mechanic_id', currentUserId)
        .order('created_at', { ascending: false })

      if (docsErr) {
        console.warn('[DOCUMENTS FETCH FAULT]:', docsErr.message)
      }

      // 6. Fetch reviews
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from('request_reviews')
        .select(`
          id,
          rating,
          review,
          created_at,
          driver:profiles!request_reviews_driver_id_fkey (full_name)
        `)
        .eq('mechanic_id', currentUserId)
        .order('created_at', { ascending: false })

      if (reviewsErr) {
        console.warn('[REVIEWS FETCH FAULT]:', reviewsErr.message)
      }

      // 7. Fetch pending profile change requests
      const { data: changeReqData, error: changeReqErr } = await supabase
        .from('profile_change_requests')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (changeReqErr) {
        console.warn('[CHANGE REQUESTS FETCH FAULT]:', changeReqErr.message)
      }

      if (mounted && userIdRef.current) {
        const resolvePhoneNumber = (profileVal, userObj) => {
          const isValidPhone = (val) => {
            if (!val) return false
            const clean = val.toString().trim()
            return clean.length > 0 && !/[a-zA-Z]/.test(clean)
          }
          
          const userMetaPhone = userObj?.user_metadata?.phone
          if (isValidPhone(userMetaPhone)) return userMetaPhone.toString().trim()

          const pPhone = typeof profileVal === 'object' ? profileVal?.phone : profileVal
          if (isValidPhone(pPhone)) return pPhone.toString().trim()

          const userPhone = userObj?.phone
          if (isValidPhone(userPhone)) return userPhone.toString().trim()

          return ''
        }

        setMechanicProfile(mechData || null)
        setCompletedRescuesCount(completedCount || 0)
        setDocuments(docsData || [])
        setReviews(reviewsData || [])
        setPendingChangeRequests(changeReqData || [])

        setFormData((prev) => ({
          ...prev,
          fullName: baseProfile?.full_name || prev.fullName,
          email: baseProfile?.email || user?.email || prev.email,
          phone: resolvePhoneNumber(baseProfile, user),
          avatarUrl: baseProfile?.avatar_url || prev.avatarUrl,
          businessName: mechData?.business_name || '',
          specializations: Array.isArray(mechData?.specializations) 
            ? mechData.specializations 
            : (mechData?.specializations ? mechData.specializations.split(',').map(s => s.trim()).filter(Boolean) : []),
          serviceArea: mechData?.location_label || '',
          yearsExperience: mechData?.years_experience !== null && mechData?.years_experience !== undefined ? String(mechData.years_experience) : '',
          availability: mechData?.is_available ?? false,
          secondaryPhone: preferenceData?.secondary_phone || '',
          serviceMode: mechData?.service_mode || 'mobile',
          baseLocationLabel: mechData?.base_location_label || '',
          showBaseLocationOffline: mechData?.show_base_location_offline ?? false,
        }))
      }
    }

    loadFullProfile()
    return () => { mounted = false }
  }, [user])

  const toggleSpecialty = (specialty) => {
    const current = Array.isArray(formData.specializations) ? formData.specializations : []
    const exists = current.includes(specialty)
    const updated = exists ? current.filter(s => s !== specialty) : [...current, specialty]
    setFormData((p) => ({ ...p, specializations: updated }))
  }

  const handleChange = (field, value) => {
    let cleanValue = value
    if (field === 'phone' || field === 'secondaryPhone') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10)
    }
    setFormData((p) => ({ ...p, [field]: cleanValue }))
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image asset size threshold must be under 2MB')
      return
    }

    try {
      setUploadingAvatar(true)
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }))
      toast.success('Profile avatar image updated successfully')
    } catch (err) {
      toast.error(err.message || 'Error processing profile image binary stream upload')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF or Image (PNG, JPG) documents are supported')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Document size must be under 5MB')
      return
    }

    try {
      setUploadingDoc(true)
      const supabase = createClient()

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('mechanic-documents')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: docRecord, error: dbError } = await supabase
        .from('mechanic_documents')
        .insert({
          mechanic_id: user.id,
          document_name: file.name,
          file_url: filePath
        })
        .select()
        .single()

      if (dbError) throw dbError

      const { error: profileError } = await supabase
        .from('mechanic_profiles')
        .update({ verification_status: 'pending' })
        .eq('user_id', user.id)

      if (profileError) {
        console.warn('Failed to reset verification_status in mechanic_profiles:', profileError.message)
      }

      const { error: verificationError } = await supabase
        .from('mechanic_verifications')
        .update({ status: 'pending' })
        .eq('mechanic_id', user.id)

      if (verificationError) {
        console.warn('Failed to reset status in mechanic_verifications:', verificationError.message)
      }

      setDocuments(prev => [docRecord, ...prev])

      // Find all admin profiles and notify them
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')

        if (admins && admins.length > 0) {
          const adminNotifs = admins.map(adm => ({
            profile_id: adm.id,
            type: 'verification',
            title: 'New Verification Document',
            body: `Mechanic ${profile?.full_name || 'Partner'} submitted a new document: ${file.name}.`,
            is_read: false,
          }))
          await supabase.from('notifications').insert(adminNotifs)
        }
      } catch (notifErr) {
        console.warn('Failed to notify admins of document submission:', notifErr)
      }

      toast.success('Document uploaded successfully! Profile verification re-queued.')
      
      if (mechanicProfile) {
        setMechanicProfile(prev => ({
          ...prev,
          verification_status: 'pending'
        }))
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload document')
    } finally {
      setUploadingDoc(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const handleViewDocument = async (fileUrl) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('mechanic-documents')
        .createSignedUrl(fileUrl, 300)
      
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Error generating document view link:', err)
      toast.error('Failed to resolve document link')
    }
  }



  const pinBaseLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setPinningLocation(true)
    const supabase = createClient()
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const { error } = await supabase
            .from('mechanic_profiles')
            .update({
              base_location: `POINT(${longitude} ${latitude})`,
            })
            .eq('user_id', user?.id)

          if (error) throw error
          
          // Re-fetch mechanic profile locally to display new coordinates
          const { data: updatedProfile } = await supabase
            .from('mechanic_profiles')
            .select('base_location')
            .eq('user_id', user?.id)
            .maybeSingle()
            
          setMechanicProfile((prev) => ({
            ...prev,
            base_location: updatedProfile?.base_location || prev?.base_location
          }))

          toast.success('Base/Shop location pinned successfully!')
        } catch (err) {
          toast.error('Failed to pin base location: ' + err.message)
        } finally {
          setPinningLocation(false)
        }
      },
      (err) => {
        toast.error('Error getting location: ' + err.message)
        setPinningLocation(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const getUserInitials = () => {
    const name = formData.fullName || profile?.full_name || 'Mechanic'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  const handleSave = async () => {
    if (formData.phone.trim().length !== 10 || !formData.phone.trim().startsWith('0')) {
      toast.error('Primary phone number must be exactly 10 digits starting with 0.')
      return
    }

    if (formData.secondaryPhone.trim()) {
      const sPhone = formData.secondaryPhone.trim()
      if (sPhone.length !== 10 || !sPhone.startsWith('0')) {
        toast.error('Backup phone number must be exactly 10 digits starting with 0.')
        return
      }
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      // 1. Direct update for base profile (full_name, phone)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: formData.fullName.trim(), phone: formData.phone.trim() })
        .eq('id', user?.id)

      if (profileError) throw profileError

      let currentStatusVal = null
      if (!formData.availability) {
        const { data: activeJobs } = await supabase
          .from('rescue_requests')
          .select('id')
          .eq('mechanic_id', user?.id)
          .in('status', ['accepted', 'en_route', 'arrived', 'in_progress'])
          .limit(1)

        if (activeJobs && activeJobs.length > 0) {
          currentStatusVal = new Date().toISOString()
        }
      }

      // 2. Direct update for non-sensitive operational fields on mechanic_profiles
      const { error: mechanicError } = await supabase
        .from('mechanic_profiles')
        .update({
          is_available: formData.availability,
          current_status: currentStatusVal,
          service_mode: formData.serviceMode,
          base_location_label: formData.baseLocationLabel.trim() || null,
          show_base_location_offline: formData.showBaseLocationOffline,
        })
        .eq('user_id', user?.id)

      if (mechanicError) throw mechanicError

      // 3. Sensitive / Verified Fields: Check for differences and route to profile_change_requests
      const currentSpecs = Array.isArray(mechanicProfile?.specializations) 
        ? [...mechanicProfile.specializations].sort() 
        : []
      const newSpecs = Array.isArray(formData.specializations) 
        ? [...formData.specializations].sort() 
        : []
      const specsChanged = JSON.stringify(currentSpecs) !== JSON.stringify(newSpecs)

      const currentBiz = (mechanicProfile?.business_name || '').trim()
      const newBiz = (formData.businessName || '').trim()
      const bizChanged = currentBiz !== newBiz

      const currentExp = mechanicProfile?.years_experience !== null && mechanicProfile?.years_experience !== undefined ? Number(mechanicProfile.years_experience) : 0
      const newExp = formData.yearsExperience ? parseInt(formData.yearsExperience, 10) || 0 : 0
      const expChanged = currentExp !== newExp

      const currentArea = (mechanicProfile?.location_label || '').trim()
      const newArea = (formData.serviceArea || '').trim()
      const areaChanged = currentArea !== newArea

      const changeSubmissions = []

      if (bizChanged) {
        changeSubmissions.push({
          role: 'mechanic',
          target_table: 'mechanic_profiles',
          field_key: 'business_name',
          old_value: currentBiz || null,
          new_value: newBiz || null,
          reason: 'Mechanic requested business trade name update from profile settings',
        })
      }

      if (specsChanged) {
        changeSubmissions.push({
          role: 'mechanic',
          target_table: 'mechanic_profiles',
          field_key: 'specializations',
          old_value: currentSpecs,
          new_value: newSpecs,
          reason: 'Mechanic requested specialties update from profile settings',
        })
      }

      if (expChanged) {
        changeSubmissions.push({
          role: 'mechanic',
          target_table: 'mechanic_profiles',
          field_key: 'years_experience',
          old_value: currentExp,
          new_value: newExp,
          reason: 'Mechanic requested years of experience update from profile settings',
        })
      }

      if (areaChanged) {
        changeSubmissions.push({
          role: 'mechanic',
          target_table: 'mechanic_profiles',
          field_key: 'location_label',
          old_value: currentArea || null,
          new_value: newArea || null,
          reason: 'Mechanic requested primary service area update from profile settings',
        })
      }

      let sensitiveSubmittedCount = 0
      for (const change of changeSubmissions) {
        try {
          const res = await fetch('/api/profile/change-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(change),
          })
          if (res.ok) {
            sensitiveSubmittedCount++
          }
        } catch (e) {
          console.warn('Failed to submit change request:', change.field_key, e)
        }
      }

      // Secondary phone preference sync
      try {
        await fetch('/api/profile/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secondary_phone: formData.secondaryPhone,
          }),
        })
      } catch (prefErr) {
        console.warn('Preferences middleware sync bypassed:', prefErr)
      }

      // Refresh pending change requests list
      const { data: updatedPending } = await supabase
        .from('profile_change_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (updatedPending) {
        setPendingChangeRequests(updatedPending)
      }

      setMechanicProfile((prev) => ({
        ...prev,
        is_available: formData.availability,
        service_mode: formData.serviceMode,
        base_location_label: formData.baseLocationLabel,
        show_base_location_offline: formData.showBaseLocationOffline,
      }))

      if (sensitiveSubmittedCount > 0) {
        toast.success(
          `Operational settings saved. ${sensitiveSubmittedCount} sensitive parameter change(s) submitted for Admin approval.`,
          { duration: 5000 }
        )
      } else {
        toast.success('Profile configurations updated successfully')
      }

      setIsEditing(false)
    } catch (err) {
      toast.error(err?.message || 'Failed to complete configuration synchronization logs')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return <PageWrapper title="Account"><div className="flex items-center justify-center py-12"><Spinner /></div></PageWrapper>

  return (
    <PageWrapper title="Profile Settings" description="Configure active workplace criteria, review verified deployment metrics, and manage system environment options.">
      <MechanicTour />
      <div className="mx-auto max-w-4xl space-y-6 pb-12">

        {/* ================= HERO IDENTITY INTERFACE ================= */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
              
              <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg sm:text-xl tracking-tight">
                      {getUserInitials()}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-slate-950/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {uploadingAvatar ? (
                    <Loader2 size={16} className="text-white animate-spin" />
                  ) : (
                    <Camera size={18} className="text-white" />
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" disabled={uploadingAvatar} />
              </div>

              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="space-y-1.5">
                    <Input 
                      value={formData.fullName} 
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      className="text-lg sm:text-xl font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 outline-none focus:border-amber-400 transition-colors" 
                    />
                  </div>
                ) : (
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words">
                    {formData.fullName || 'Service Provider'}
                  </h2>
                )}
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 break-words">
                  {formData.businessName || 'Independent Recovery Expert'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge label="Profile Active" variant="success" />
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${formData.availability ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                    {formData.availability ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0">
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await resetTour('mechanic_v1')
                      toast.success('Tour reset! The mechanic walkthrough will appear.')
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-98"
                  >
                    <HelpCircle size={14} className="text-amber-500" />
                    <span>Take Tour Again</span>
                  </button>
                  <button onClick={() => setIsEditing(true)} className="rounded-xl border border-slate-200 bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider text-slate-800 shadow-xs hover:bg-slate-50 transition-all active:scale-98 cursor-pointer">
                    Edit Parameters
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl px-3.5 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider border-slate-200">Cancel</Button>
                  <Button loading={loading} onClick={handleSave} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-xs">Save</Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ================= TRUST METRICS LEDGER ================= */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Award size={14} className="text-slate-400" /> Trust Scorecard</p>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5 flex-wrap">
              <Star size={18} className="text-amber-500 fill-amber-500 shrink-0 self-center" />
              <span>{mechanicProfile?.rating_avg ? Number(mechanicProfile.rating_avg).toFixed(1) : '5.0'}</span>
              <span className="text-xs font-semibold text-slate-400 font-normal">({mechanicProfile?.rating_count ?? 0} reviews)</span>
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Aggregated customer evaluation</p>
          </Card>

          <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><CheckCircle2 size={14} className="text-slate-400" /> Job Completions</p>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{completedRescuesCount}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Successful corridor rescue logs</p>
          </Card>

          <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> Terminal Tenure</p>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {mechanicProfile?.created_at ? new Date(mechanicProfile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'June 2026'}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Account registered</p>
          </Card>
        </div>

        {/* ================= WORKPLACE OPTIONS ================= */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs relative">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Building2 size={15} className="text-amber-500" /> Workplace Parameters
            </h3>
            {pendingChangeRequests.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-800">
                <AlertTriangle size={13} className="text-amber-600" />
                {pendingChangeRequests.length} update{pendingChangeRequests.length > 1 ? 's' : ''} awaiting admin review
              </span>
            )}
          </div>

          {/* Pending clearance alert banner if any requests exist */}
          {pendingChangeRequests.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 sm:p-4 text-xs">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-amber-600 shrink-0" /> Sensitive Field Changes Under Administrative Review
              </p>
              <div className="mt-2 space-y-1.5 text-amber-800">
                {pendingChangeRequests.map((req) => (
                  <div key={req.id} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-amber-950 bg-amber-200/60 px-2 py-0.5 rounded">
                      {req.field_key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-amber-700">Proposed:</span>
                    <span className="font-semibold text-amber-950">
                      {Array.isArray(req.new_value) ? req.new_value.join(', ') : String(req.new_value || 'None')}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-amber-700/80 italic">
                Your live public profile remains active with current verified values until reviewed and cleared by the dispatch command.
              </p>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Business Registry Name" value={formData.businessName} onChange={(e) => handleChange('businessName', e.target.value)} placeholder="e.g. Accra Pro Garage" />
                <Input label="Years of Active Experience" type="number" value={formData.yearsExperience} onChange={(e) => handleChange('yearsExperience', e.target.value)} placeholder="5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Service Range Radius (km)" type="number" value={formData.serviceRadius} onChange={(e) => handleChange('serviceRadius', e.target.value)} placeholder="30" />
                <Input label="Primary Dispatch Base Area" value={formData.serviceArea} onChange={(e) => handleChange('serviceArea', e.target.value)} placeholder="e.g. Accra Metropolitan, Greater Accra" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Service Engagement Mode"
                  value={formData.serviceMode}
                  onChange={(e) => handleChange('serviceMode', e.target.value)}
                  options={[
                    { value: 'mobile', label: 'Mobile Responder (Travels to Driver)' },
                    { value: 'fixed_location', label: 'Fixed Location (Driver Brings Vehicle to Shop)' },
                    { value: 'hybrid', label: 'Hybrid Mode (Both Mobile & Shop Operations)' },
                  ]}
                />
              </div>

              {/* Standardized Specialties Dropdown/Pills Selection */}
              <div>
                <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Specialties & Technical Capabilities
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MECHANIC_SPECIALTIES.map((spec) => {
                    const selected = Array.isArray(formData.specializations) && formData.specializations.includes(spec)
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
                          selected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500/30'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400/80 hover:bg-amber-50/30'
                        }`}
                      >
                        <span className="truncate">{spec}</span>
                        {selected ? (
                          <Check size={14} className="text-amber-700 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded border border-slate-300 bg-white shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 font-medium">
                  Standardized categories ensure accurate AI dispatch matching. Updates will be queued for Admin approval.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input 
                  label="Base Location / Shop Address" 
                  value={formData.baseLocationLabel} 
                  onChange={(e) => handleChange('baseLocationLabel', e.target.value)} 
                  placeholder="e.g. Shop 4, Spintex Road, near Shell" 
                />
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <input
                      id="showBaseLocationOffline"
                      type="checkbox"
                      checked={formData.showBaseLocationOffline}
                      onChange={(e) => setFormData(prev => ({ ...prev, showBaseLocationOffline: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <label htmlFor="showBaseLocationOffline" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Show base location to drivers on map when offline
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 mt-2">
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5"><MapPin size={14} className="text-amber-500" /> Registered Base/Shop GPS Coordinates</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {mechanicProfile?.base_location 
                      ? `Pinned Base Coordinates: ${normalizeGeoPoint(mechanicProfile.base_location)[0].toFixed(6)}, ${normalizeGeoPoint(mechanicProfile.base_location)[1].toFixed(6)}` 
                      : 'No base coordinates pinned. Click the button to pin your shop/home base location.'}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={pinBaseLocation}
                  disabled={pinningLocation}
                  className="shrink-0 h-10 px-4 rounded-xl border border-amber-200 bg-white text-xs font-bold uppercase tracking-wider text-amber-800 hover:bg-[#F5F0E0] hover:border-[#BCA86A] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {pinningLocation ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Pinning...
                    </>
                  ) : (
                    <>
                      <MapPin size={13} /> Pin Base Location
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Service Area Node</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5 break-words"><MapPin size={14} className="text-slate-400 shrink-0" /> {formData.serviceArea || 'Not configured'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Operational Range</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{formData.serviceRadius ? `${formData.serviceRadius} km deployment radius` : 'Not configured'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Base / Shop Address</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{formData.baseLocationLabel || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Base GPS Coordinates</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 font-mono break-all">
                  {mechanicProfile?.base_location 
                    ? `${normalizeGeoPoint(mechanicProfile.base_location)[0].toFixed(6)}, ${normalizeGeoPoint(mechanicProfile.base_location)[1].toFixed(6)}` 
                    : 'Not pinned'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Offline Map Visibility</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 break-words">
                  {formData.showBaseLocationOffline ? 'Public (Visible when offline)' : 'Hidden when offline'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Skills & Specialties</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Array.isArray(formData.specializations) && formData.specializations.length > 0 ? (
                    formData.specializations.map((spec) => (
                      <span key={spec} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                        <Wrench size={11} className="text-amber-600" />
                        {spec}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 break-words">
                      <Wrench size={14} className="text-slate-400 shrink-0" /> Not specified
                    </p>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Experience Depth</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{formData.yearsExperience ? `${formData.yearsExperience} Years Vetted Professional` : 'Not documented'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Service Mode</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 capitalize break-words">
                  {formData.serviceMode === 'fixed_location' 
                    ? 'Fixed Location (Shop-Based)' 
                    : formData.serviceMode === 'hybrid' 
                      ? 'Hybrid Mode' 
                      : 'Mobile Responder'}
                </p>
              </div>
            </div>
          )}
        </Card>



        {/* ================= IDENTITY & CLEARANCE CREDENTIALS ================= */}
        <Card 
          data-tour="mechanic-credentials-section"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText size={15} className="text-amber-500" /> Identity & Clearance Credentials
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
              mechanicProfile?.verification_status === 'approved' || mechanicProfile?.verification_status === 'verified'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/40'
                : mechanicProfile?.verification_status === 'more_info'
                ? 'bg-amber-50 text-amber-800 border-amber-200/40'
                : 'bg-blue-50 text-blue-800 border-blue-200/40'
            }`}>
              {mechanicProfile?.verification_status === 'approved' || mechanicProfile?.verification_status === 'verified'
                ? 'Verified'
                : mechanicProfile?.verification_status === 'more_info'
                ? 'More Info Requested'
                : mechanicProfile?.verification_status || 'Pending'}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            Upload your official credentials, such as a government-issued ID, business registry certificate, or certified mechanical credentials to authorize operations on the RoadRescue network.
          </p>

          <div className="space-y-4">
            {/* Upload Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={uploadingDoc}
                onClick={() => docInputRef.current?.click()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {uploadingDoc ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileText size={13} />
                )}
                {uploadingDoc ? 'Uploading...' : 'Upload Document'}
              </button>
              <input
                type="file"
                ref={docInputRef}
                onChange={handleDocumentUpload}
                accept="image/*,application/pdf"
                className="hidden"
                disabled={uploadingDoc}
              />
              <span className="text-[10px] font-medium text-slate-400">PDF, PNG, or JPG (Max 5MB)</span>
            </div>

            {/* Document List */}
            {documents.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-500 shrink-0">
                        <FileText size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 truncate">{doc.document_name}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                          Uploaded {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewDocument(doc.file_url)}
                      className="inline-flex h-7 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/20 py-8 text-center">
                <span className="text-slate-300 mb-1">
                  <FileText size={22} />
                </span>
                <p className="text-[11px] text-slate-400 font-semibold">No verification documents uploaded</p>
              </div>
            )}
          </div>
        </Card>

        {/* ================= RECENT REVIEWS & FEEDBACK ================= */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-5">
            <MessageSquare size={15} className="text-amber-500" /> Recent Reviews & Feedback
          </h3>
          {reviews.length === 0 ? (
            <p className="text-xs font-medium text-slate-400 text-center py-6">No client reviews or feedback logged yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => {
                const driverName = r.driver?.full_name || 'Anonymous Driver'
                return (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">by {driverName}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {r.review ? (
                      <p className="mt-2 text-xs text-slate-600 font-medium leading-relaxed break-words">{r.review}</p>
                    ) : (
                      <p className="mt-2 text-xs italic text-slate-400">No comment left.</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ================= GATED SECURITY LOG VERIFICATION Snapshots ================= */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ShieldAlert size={15} className="text-amber-500" /> Gated System Records
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200/40 font-bold uppercase tracking-wider">Locked</span>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Secure Core Account Email</span>
              <p className="mt-1 text-sm font-semibold text-slate-400 flex items-center gap-1.5 break-all"><Mail size={14} className="shrink-0" /> {formData.email || '—'}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Registered Dispatch Phone</span>
              {isEditing ? (
                <div className="mt-1">
                  <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="e.g. 0241234567" />
                  {formData.phone && (formData.phone.length !== 10 || !formData.phone.startsWith('0')) && (
                    <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                      <span>Must be exactly 10 digits starting with 0.</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5 break-words"><Phone size={14} className="shrink-0" /> {formData.phone || 'No phone registered'}</p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Backup Communications Line</span>
              {isEditing ? (
                <div className="mt-1">
                  <Input value={formData.secondaryPhone} onChange={(e) => handleChange('secondaryPhone', e.target.value)} placeholder="e.g. 0241234567" />
                  {formData.secondaryPhone && (formData.secondaryPhone.length !== 10 || !formData.secondaryPhone.startsWith('0')) && (
                    <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                      <span>Must be exactly 10 digits starting with 0.</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5 break-words"><Phone size={14} className="text-slate-400 shrink-0" /> {formData.secondaryPhone || 'Not set'}</p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Regulatory License Frame</span>
              <p className="mt-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5 break-words"><FileText size={14} className="text-slate-400 shrink-0" /> {formData.licenseNumber || 'Under administrative review'}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Credential Expiration Timestamp</span>
              <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{formData.licenseExpiry ? new Date(formData.licenseExpiry).toLocaleDateString() : '—'}</p>
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}