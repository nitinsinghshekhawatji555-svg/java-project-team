'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone, CarFront, BadgeCheck, Shield, Camera, Loader2, Activity, AlertTriangle, HelpCircle } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'

export default function DriverAccountPage() {
  const { user, profile, setProfile } = useAuth()
  const { resetTour } = useOnboarding('driver_skip_hint_v1')
  const [driverProfile, setDriverProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [dataInitialized, setDataInitialized] = useState(false)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    vehiclePlate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    homeArea: '',
  })

  useEffect(() => {
    if (!user?.id || !profile || dataInitialized) return

    let mounted = true

    async function loadFullProfile() {
      const supabase = createClient()
      
      // FIXED: Removed non-existent rating_avg and total_requests from the query selection array
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate, emergency_contact_name, emergency_contact_phone, home_area')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[PROFILE SYNC ERROR]:', error.message)
      }

      if (mounted) {
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

        setDriverProfile(data || null)
        setFormData({
          fullName: profile?.full_name || '',
          email: profile?.email || '', // Locked parameter field
          phone: resolvePhoneNumber(profile, user),
          avatarUrl: profile?.avatar_url || '',
          vehicleMake: data?.vehicle_make || '',
          vehicleModel: data?.vehicle_model || '',
          vehicleYear: data?.vehicle_year || '',
          vehicleColor: data?.vehicle_color || '',
          vehiclePlate: data?.vehicle_plate || '',
          emergencyContactName: data?.emergency_contact_name || '',
          emergencyContactPhone: data?.emergency_contact_phone || '',
          homeArea: data?.home_area || '',
        })
        setDataInitialized(true)
      }
    }

    loadFullProfile()

    return () => {
      mounted = false
    }
  }, [user, profile, dataInitialized])

  const handleChange = (field, value) => {
    let cleanValue = value
    if (field === 'phone' || field === 'emergencyContactPhone') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10)
    }
    setFormData((prev) => ({ ...prev, [field]: cleanValue }))
  }

  // File Upload Pipeline targeting Supabase Storage Bucket
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Enforce 2MB profile picture upload limits
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }

    try {
      setUploadingAvatar(true)
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Math.random()}.${fileExt}`

      // 1. Stream file payload into the pre-configured 'avatars' storage space
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // 2. Resolve the public asset access path link
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Immediately commit profile image sync step to the core data table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }))
      toast.success('Avatar image synchronized successfully')
    } catch (err) {
      toast.error(err.message || 'Failed to process avatar file upload')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (formData.phone.trim().length !== 10 || !formData.phone.trim().startsWith('0')) {
      toast.error('Primary phone number must be exactly 10 digits starting with 0.')
      return
    }

    if (formData.emergencyContactPhone.trim()) {
      const ePhone = formData.emergencyContactPhone.trim()
      if (ePhone.length !== 10 || !ePhone.startsWith('0')) {
        toast.error('SOS phone number must be exactly 10 digits starting with 0.')
        return
      }
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // Mutate central details tracking table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
        })
        .eq('id', user?.id)

      if (profileError) throw profileError

      const payload = {
        vehicle_make: formData.vehicleMake.trim(),
        vehicle_model: formData.vehicleModel.trim(),
        vehicle_year: formData.vehicleYear ? parseInt(formData.vehicleYear, 10) || null : null,
        vehicle_color: formData.vehicleColor.trim(),
        vehicle_plate: formData.vehiclePlate.trim().toUpperCase(),
        emergency_contact_name: formData.emergencyContactName.trim(),
        emergency_contact_phone: formData.emergencyContactPhone.trim(),
        home_area: formData.homeArea.trim(),
      }

      // Upsert tracking layer evaluation
      const { error: updateError } = await supabase
        .from('driver_profiles')
        .update(payload)
        .eq('user_id', user?.id)

      if (updateError) throw updateError

      // Insert driver profile updated notification
      try {
        await supabase.from('notifications').insert({
          profile_id: user?.id,
          type: 'system',
          title: 'Profile Updated',
          body: 'Your profile details and vehicle snapshot have been successfully updated.',
          is_read: false,
        })
      } catch (notifErr) {
        console.warn('Failed to insert driver profile update notification:', notifErr)
      }

      setDriverProfile(payload)
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch (error) {
      toast.error(error.message || 'Failed to update profile data rows')
    } finally {
      setLoading(false)
    }
  }

  if (!profile || !dataInitialized) {
    return (
      <div className="w-full min-h-fit bg-transparent flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Spinner />
          <p className="text-xs font-bold text-[#7C6B44] uppercase tracking-widest animate-pulse">Please wait...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex-grow bg-transparent text-[#1F1B10] px-1 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 md:pt-6 md:px-0 flex justify-center items-start lg:pb-8">
      <div className="w-full max-w-2xl flex flex-col gap-5">
        
        {/* Profile Card Header with Dynamic Avatar Management Terminal */}
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-[#DCCDA9] bg-[#FFF9EF] p-5 shadow-sm">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-20 h-20 rounded-full border-2 border-[#DCCDA9] overflow-hidden bg-amber-50 flex items-center justify-center shadow-inner">
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar profile" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-[#7C6B44]" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {uploadingAvatar ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Camera size={18} className="text-white" />
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" disabled={uploadingAvatar} />
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-lg font-black tracking-tight text-[#1F1B10]">{formData.fullName || 'Active Driver'}</h1>
            <p className="text-xs text-[#7C6B44] font-medium">RoadRescue Driver Hub</p>
          </div>
        </div>

        {/* Section 1: Core Base Profiles */}
        <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3.5">
            <h2 className="text-sm font-black flex items-center gap-2 text-[#1F1B10]">
              <User size={16} className="text-primary" />
              Personal Details
            </h2>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="rounded-xl border border-[#DCCDA9] bg-white px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#1F1B10] shadow-sm hover:bg-slate-50">
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-slate-800">
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-mono font-black uppercase tracking-wider text-[#7C6B44]">Full Display Name</label>
              {isEditing ? (
                <Input value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="Your full name" />
              ) : (
                <p className="text-sm font-bold text-[#1F1B10]">{formData.fullName || 'Not configured'}</p>
              )}
            </div>

            {/* IMMUTABLE LOCKED COMPONENT ENTRY */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-wider text-[#7C6B44]">
                <Mail size={12} /> Registered Email Address
              </label>
              <p className="text-sm font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 select-none">
                {formData.email || 'Not configured'}
              </p>
              <p className="mt-1 text-[9px] font-medium text-slate-400">Security constraint: Email cannot be change. Report for a review</p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-wider text-[#7C6B44]">
                <Phone size={12} /> Contact Phone Number
              </label>
              {isEditing ? (
                <>
                  <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="e.g. 0241234567" />
                  {formData.phone && (formData.phone.length !== 10 || !formData.phone.startsWith('0')) && (
                    <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                      <span>Must be exactly 10 digits starting with 0.</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-[#1F1B10]">{formData.phone || 'Not configured'}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-mono font-black uppercase tracking-wider text-[#7C6B44]">Primary Operation Base Area</label>
              {isEditing ? (
                <Input value={formData.homeArea} onChange={(e) => handleChange('homeArea', e.target.value)} placeholder="Accra, East Legon, Kasoa..." />
              ) : (
                <p className="text-sm font-bold text-[#1F1B10]">{formData.homeArea || 'Not configured'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Vehicle Management Blocks */}
        <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-sm">
          <div className="border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3.5">
            <h2 className="text-sm font-black flex items-center gap-2 text-[#1F1B10]">
              <CarFront size={16} className="text-primary" />
              Vehicle Snapshot Profile
            </h2>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#7C6B44]">Vehicle Make</label>
              {isEditing ? <Input value={formData.vehicleMake} onChange={(e) => handleChange('vehicleMake', e.target.value)} placeholder="Toyota" /> : <p className="text-sm font-bold text-[#1F1B10]">{formData.vehicleMake || '—'}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#7C6B44]">Vehicle Model</label>
              {isEditing ? <Input value={formData.vehicleModel} onChange={(e) => handleChange('vehicleModel', e.target.value)} placeholder="Camry" /> : <p className="text-sm font-bold text-[#1F1B10]">{formData.vehicleModel || '—'}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#7C6B44]">Production Year</label>
              {isEditing ? <Input type="number" value={formData.vehicleYear} onChange={(e) => handleChange('vehicleYear', e.target.value)} placeholder="2022" /> : <p className="text-sm font-bold text-[#1F1B10]">{formData.vehicleYear || '—'}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#7C6B44]">Chassis Color</label>
              {isEditing ? <Input value={formData.vehicleColor} onChange={(e) => handleChange('vehicleColor', e.target.value)} placeholder="Silver" /> : <p className="text-sm font-bold text-[#1F1B10]">{formData.vehicleColor || '—'}</p>}
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-3">
              <label className="mb-1 block text-xs font-bold text-[#7C6B44]">License Plate Number</label>
              {isEditing ? <Input value={formData.vehiclePlate} onChange={(e) => handleChange('vehiclePlate', e.target.value)} placeholder="GR-2847-21" /> : <p className="text-sm font-mono font-bold text-slate-800">{formData.vehiclePlate || '—'}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Safety SOS Emergency Linking */}
        <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-sm">
          <div className="border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3.5">
            <h2 className="text-sm font-black flex items-center gap-2 text-[#1F1B10]">
              <Shield size={16} className="text-primary" />
              Emergency Contact (SOS Link)
            </h2>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#7C6B44]">Next of Kin Name</label>
              {isEditing ? <Input value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} placeholder="Jane Doe" /> : <p className="text-sm font-bold text-[#1F1B10]">{formData.emergencyContactName || '—'}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#7C6B44]">SOS Phone Number</label>
              {isEditing ? (
                <>
                  <Input value={formData.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} placeholder="e.g. 0241234567" />
                  {formData.emergencyContactPhone && (formData.emergencyContactPhone.length !== 10 || !formData.emergencyContactPhone.startsWith('0')) && (
                    <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                      <span>Must be exactly 10 digits starting with 0.</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-[#1F1B10]">{formData.emergencyContactPhone || '—'}</p>
              )}
            </div>
          </div>

          {driverProfile?.vehicle_plate && (
            <div className="m-4 mt-0 rounded-xl border border-amber-200 bg-[#FFF9EF] p-3 flex items-start gap-2.5">
              <BadgeCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Verified System Ledger:</span> Your default vehicle parameters are active and will prefill future assistance dispatches.
              </p>
            </div>
          )}
        </div>

        {/* Section 4: App Walkthrough & Guide */}
        <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF9EF] border border-[#DCCDA9] text-[#7C6B44]">
              <HelpCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1F1B10]">App Walkthrough</p>
              <p className="text-[11px] text-slate-500">Reset guides and hints for emergency requests.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await resetTour('driver_skip_hint_v1')
              toast.success('Walkthrough reset! Next time you tap SOS, the guide will appear.')
            }}
            className="px-3.5 py-2 rounded-xl border border-[#DCCDA9] bg-[#FFF9EF] hover:bg-[#F5ECD5] text-[#7C6B44] text-xs font-bold transition cursor-pointer active:scale-95"
          >
            Reactivate
          </button>
        </div>

      </div>
    </div>
  )
}