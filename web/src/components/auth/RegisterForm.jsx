'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { signUp } from '@/lib/auth'
import { USER_ROLE, MECHANIC_SPECIALTIES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Info, Check, Wrench } from 'lucide-react'

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [showOptionalDetails, setShowOptionalDetails] = useState(false)

  const roleParam = searchParams.get('role')?.toLowerCase()
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    role: roleParam === USER_ROLE.MECHANIC ? USER_ROLE.MECHANIC : USER_ROLE.DRIVER,
    businessName: '',
    yearsExperience: '',
    serviceArea: '',
    specializations: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    vehiclePlate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  })

  useEffect(() => {
    if (roleParam === USER_ROLE.MECHANIC || roleParam === USER_ROLE.DRIVER) {
      setFormData((prev) => (prev.role === roleParam ? prev : { ...prev, role: roleParam }))
    }
  }, [roleParam])

  const isMechanic = formData.role === USER_ROLE.MECHANIC
  const isDriver = formData.role === USER_ROLE.DRIVER

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    if (field === 'role') {
      setShowOptionalDetails(false)
    }
  }

  function parseSpecializations(value) {
    if (Array.isArray(value)) return value.filter(Boolean)
    if (!value) return []
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function toggleSpecialty(specialty) {
    const current = Array.isArray(formData.specializations) 
      ? formData.specializations 
      : parseSpecializations(formData.specializations)
    
    const exists = current.includes(specialty)
    const updated = exists 
      ? current.filter(s => s !== specialty)
      : [...current, specialty]
    
    updateField('specializations', updated)
  }

  async function saveMechanicProfile(userId) {
    const specs = parseSpecializations(formData.specializations)
    if (!formData.businessName && specs.length === 0 && !formData.yearsExperience && !formData.serviceArea) {
      return
    }

    const supabase = createClient()
    const mechanicPayload = {}
    
    if (formData.businessName.trim()) mechanicPayload.business_name = formData.businessName.trim()
    if (specs.length > 0) mechanicPayload.specializations = specs
    if (formData.yearsExperience) mechanicPayload.years_experience = parseInt(formData.yearsExperience, 10) || 0
    if (formData.serviceArea.trim()) mechanicPayload.location_label = formData.serviceArea.trim()

    if (Object.keys(mechanicPayload).length === 0) return

    const { error } = await supabase
      .from('mechanic_profiles')
      .update(mechanicPayload)
      .eq('user_id', userId)

    if (error) throw error
  }

 async function saveDriverProfile(userId) {
  if (
    !formData.vehicleMake && !formData.vehicleModel && !formData.vehicleYear &&
    !formData.vehicleColor && !formData.vehiclePlate && !formData.serviceArea &&
    !formData.emergencyContactName && !formData.emergencyContactPhone
  ) {
    return
  }

  const supabase = createClient()
  const driverPayload = {}

  if (formData.serviceArea.trim()) {
    driverPayload.home_area = formData.serviceArea.trim()
  }
  if (formData.vehicleMake.trim()) driverPayload.vehicle_make = formData.vehicleMake.trim()
  if (formData.vehicleModel.trim()) driverPayload.vehicle_model = formData.vehicleModel.trim()
  if (formData.vehicleYear) driverPayload.vehicle_year = parseInt(formData.vehicleYear, 10) || null
  if (formData.vehicleColor.trim()) driverPayload.vehicle_color = formData.vehicleColor.trim()
  if (formData.vehiclePlate.trim()) driverPayload.vehicle_plate = formData.vehiclePlate.trim().toUpperCase()
  if (formData.emergencyContactName.trim()) driverPayload.emergency_contact_name = formData.emergencyContactName.trim()
  if (formData.emergencyContactPhone.trim()) driverPayload.emergency_contact_phone = formData.emergencyContactPhone.trim()

  if (Object.keys(driverPayload).length === 0) return

  const { error } = await supabase
    .from('driver_profiles')
    .update(driverPayload)
    .eq('user_id', userId)

  if (error) throw error

  }

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setLoading(true)
      const email = formData.email.trim()
      const fullName = formData.fullName.trim()
      const phone = formData.phone.trim()

      if (phone.length !== 10 || !phone.startsWith('0')) {
        toast.error('Primary phone number must be exactly 10 digits starting with 0.')
        setLoading(false)
        return
      }

      if (formData.role === 'driver' && formData.emergencyContactPhone.trim()) {
        const ePhone = formData.emergencyContactPhone.trim()
        if (ePhone.length !== 10 || !ePhone.startsWith('0')) {
          toast.error('Emergency contact phone number must be exactly 10 digits starting with 0.')
          setLoading(false)
          return
        }
      }

      if (!fullName || !phone || !email || !formData.password) {
        toast.error('Please fill in your name, phone, email, and password.')
        return
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long.')
        return
      }

      if (!consentAccepted) {
        toast.error('Please accept the consent terms to continue.')
        return
      }

      const data = await signUp({
        email,
        password: formData.password,
        fullName,
        phone,
        role: formData.role,
      })

      const userId = data?.user?.id || data?.session?.user?.id
      const role = data?.user?.user_metadata?.role || data?.session?.user?.user_metadata?.role || formData.role

      if (userId && showOptionalDetails) {
        if (role === USER_ROLE.MECHANIC) {
          await saveMechanicProfile(userId)
        }
        if (role === USER_ROLE.DRIVER) {
          await saveDriverProfile(userId)
        }
      }

      const roleLabel = formData.role.toLowerCase()
      const wrapperStyle = "background-color: #FFF8EA; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"
      const containerStyle = "max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #DCCDA9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(31, 27, 16, 0.03);"
      const headerStyle = "background: #1F1B10; padding: 32px 24px; text-align: center; border-bottom: 3px solid #f5c400;"
      const bodyStyle = "padding: 32px 24px; color: #1F1B10;"
      const greetingStyle = "font-size: 16px; font-weight: 800; margin-top: 0; margin-bottom: 12px; color: #1F1B10;"
      const textStyle = "font-size: 14px; line-height: 1.6; color: #5E5440; margin-top: 0; margin-bottom: 20px;"
      const parameterBoxStyle = "background-color: #FFF9EF; border: 1px solid #E0D5B7; border-radius: 12px; padding: 16px; margin: 24px 0;"
      const buttonStyle = "display: inline-block; background-color: #f5c400; color: #1F1B10; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; padding: 14px 28px; border-radius: 12px; text-decoration: none; text-align: center; box-shadow: 0 4px 10px rgba(245, 196, 0, 0.2);"
      const footerStyle = "text-align: center; padding: 24px; border-top: 1px solid #FFF1D6; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #7C6B44; background-color: #FFF9EF;"

      const structuredEmailContent = `
        <div style="${wrapperStyle}">
          <div style="${containerStyle}">
            <div style="${headerStyle}">
              <span style="font-size: 10px; font-weight: 900; color: #f5c400; text-transform: uppercase; letter-spacing: 0.2em; display: block; margin-bottom: 6px;">Clearance Authenticated</span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #ffffff;">Welcome to RoadRescue!</h1>
            </div>
            <div style="${bodyStyle}">
              <p style="${greetingStyle}">Welcome aboard, ${fullName},</p>
              <p style="${textStyle}">Successfully verified. You are now connected to the RoadRescue network as an active <strong>${roleLabel}</strong> </p>
              
              <div style="${parameterBoxStyle}">
                <p style="font-size: 13px; line-height: 1.6; color: #1F1B10; margin: 0; font-weight: 500;">
                  ${roleLabel === 'mechanic' 
                    ? 'Thank you for partnering with us to keep our community safe and moving. We connect you with nearby breakdowns so you can grow your workshop revenue efficiently.' 
                    : "Your safety is our top priority, and we're here to ensure help is always within reach. We are built to ensure every roadside assistance is secure, reliable, and seamless."
                  }
                </p>
              </div>

              <p style="${textStyle}">Please log into your dashboard to request rescues, update your profile picture, verify your direct contact lines, and prefill any vehicle or garage details to ensure perfect dispatch matching metrics.</p>
              <br>
              <p style="${textStyle}">If you have any questions or need assistance, please reach out to our support team at <a href="mailto:ayelgumhandson001@gmail.com" style="color: #f5c400; text-decoration: underline;">roadrescuesupportteam@dev</a></p>
              <p style="${textStyle}">All the best</p>
              <div style="text-align: center; margin-top: 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://roadrescue-gh.vercel.app'}/auth/login" style="${buttonStyle}">Go to Your Dashboard</a>
              </div>
            </div>
            <div style="${footerStyle}">RoadRescue GH Operations Network</div>
          </div>
        </div>
      `

      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Welcome to RoadRescue — Secure ${formData.role} Session`,
          htmlContent: structuredEmailContent,
        }),
      })

      toast.success('Account created successfully! Please log in to view your dashboard.')
      router.replace('/auth/login')
    } catch (err) {
      console.error('[SIGNUP PORTAL FAULT]', err)
      toast.error(err?.message || 'Registration failed')
    } finally {
      document.body.style.pointerEvents = 'auto'
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Role Selection Tabs */}
      <div>
        <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
          Your Role Context
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {[USER_ROLE.DRIVER, USER_ROLE.MECHANIC].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => updateField('role', role)}
              className={`rounded-xl border h-[44px] text-xs font-black uppercase tracking-wider transition-all duration-200 cubic-bezier(0.4,0,0.2,1) ${
                formData.role === role
                  ? 'border-[#1A1609] bg-[#1A1609] text-white shadow-sm'
                  : 'border-[#DDD0A8] bg-white text-[#6B5E3E] hover:bg-[#FFFBF4] hover:text-[#1F1B10]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* MECHANIC OPTIONAL PROFILE CARD */}
      {isMechanic && (
        <div className="rounded-[18px] border border-[#DDD0A8]/60 bg-[#FFFBF4] transition-all overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FFF9ED] border-b border-[#E5D9B6]/60">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#1F1B10]">
                Mechanic Setup <span className="text-[11px] font-medium text-slate-700/70">(Optional)</span>
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B5E3E]">Configure advanced profile matching fields now or skip to finish.</p>
            </div>
            <button 
              type="button" 
              onClick={() => setShowOptionalDetails((s) => !s)} 
              className="text-[11px] font-black uppercase tracking-wide bg-white border border-[#DDD0A8] rounded-lg px-3 py-1.5 text-[#1F1B10] hover:bg-[#FFFBF4] transition-colors shadow-sm shrink-0 self-start sm:self-center"
            >
              {showOptionalDetails ? 'Hide Options' : 'More Options'}
            </button>
          </div>

          {showOptionalDetails && (
            <div className="space-y-4 p-4 bg-white">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Business Name</label>
                <Input placeholder="RoadRescue Pro Garage" value={formData.businessName} onChange={(e) => updateField('businessName', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Years of Experience</label>
                  <Input type="number" min="0" placeholder="5" value={formData.yearsExperience} onChange={(e) => updateField('yearsExperience', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Service Area Location</label>
                  <Input placeholder="Accra, Central Region..." value={formData.serviceArea} onChange={(e) => updateField('serviceArea', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Specialties & Technical Capabilities
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MECHANIC_SPECIALTIES.map((spec) => {
                    const selected = Array.isArray(formData.specializations)
                      ? formData.specializations.includes(spec)
                      : parseSpecializations(formData.specializations).includes(spec)
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
                          selected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500/30'
                            : 'border-[#DDD0A8] bg-[#FFFBF4] text-slate-700 hover:border-amber-400/80 hover:bg-[#FFF9ED]'
                        }`}
                      >
                        <span className="truncate">{spec}</span>
                        {selected ? (
                          <Check size={14} className="text-amber-700 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded border border-[#DDD0A8] bg-white shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-[#6B5E3E]/70 font-medium">Select all services your workshop or mobile unit is equipped to provide.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DRIVER OPTIONAL PROFILE CARD */}
      {isDriver && (
        <div className="rounded-[18px] border border-[#DDD0A8]/60 bg-[#FFFBF4] transition-all overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FFF9ED] border-b border-[#E5D9B6]/60">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#1F1B10]">
                Vehicle Details & Emergency <span className="text-[11px] font-medium text-slate-700/70">(Optional)</span>
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B5E3E]">Skip now if you do not have vehicle specs on hand.</p>
            </div>
            <button 
              type="button" 
              onClick={() => setShowOptionalDetails((s) => !s)} 
              className="text-[11px] font-black uppercase tracking-wide bg-white border border-[#DDD0A8] rounded-lg px-3 py-1.5 text-[#1F1B10] hover:bg-[#FFFBF4] transition-colors shadow-sm shrink-0 self-start sm:self-center"
            >
              {showOptionalDetails ? 'Hide Options' : 'More Options'}
            </button>
          </div>

          {showOptionalDetails && (
            <div className="space-y-4 p-4 bg-white">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Vehicle Make</label>
                  <Input placeholder="Toyota" value={formData.vehicleMake} onChange={(e) => updateField('vehicleMake', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Vehicle Model</label>
                  <Input placeholder="Camry" value={formData.vehicleModel} onChange={(e) => updateField('vehicleModel', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Vehicle Year</label>
                  <Input type="number" min="1970" placeholder="2022" value={formData.vehicleYear} onChange={(e) => updateField('vehicleYear', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Vehicle Color</label>
                  <Input placeholder="Silver" value={formData.vehicleColor} onChange={(e) => updateField('vehicleColor', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Plate Number</label>
                  <Input placeholder="GW-4920-24" value={formData.vehiclePlate} onChange={(e) => updateField('vehiclePlate', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Home Area</label>
                  <Input placeholder="Kasoa, Cantonments..." value={formData.serviceArea} onChange={(e) => updateField('serviceArea', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 border-t border-[#E5D9B6]/40 pt-4 mt-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Emergency Contact Name</label>
                  <Input placeholder="John Doe" value={formData.emergencyContactName} onChange={(e) => updateField('emergencyContactName', e.target.value)} className="rounded-xl border-[#DDD0A8]" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Emergency Phone</label>
                  <Input 
                    placeholder="e.g. 0241234567" 
                    value={formData.emergencyContactPhone} 
                    onChange={(e) => updateField('emergencyContactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    className="rounded-xl border-[#DDD0A8]" 
                  />
                  {formData.emergencyContactPhone && (formData.emergencyContactPhone.length !== 10 || !formData.emergencyContactPhone.startsWith('0')) && (
                    <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" /> Must be exactly 10 digits starting with 0.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Primary Required Content inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Full Name</label>
          <Input placeholder="Kwame Mensah" value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} className="w-full h-[46px] rounded-xl border-[#DDD0A8] bg-[#FFFBF4]" />
        </div>

        <div>
          <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Phone Number</label>
          <Input 
            placeholder="e.g. 0241234567" 
            value={formData.phone} 
            onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
            className="w-full h-[46px] rounded-xl border-[#DDD0A8] bg-[#FFFBF4]" 
          />
          {formData.phone && (formData.phone.length !== 10 || !formData.phone.startsWith('0')) && (
            <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
              <AlertTriangle size={12} className="shrink-0" /> Phone number must be exactly 10 digits starting with 0.
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Email Address</label>
        <Input type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className="w-full h-[46px] rounded-xl border-[#DDD0A8] bg-[#FFFBF4]" />
      </div>

      <div>
        <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">Secure Password</label>
        <Input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => updateField('password', e.target.value)} className="w-full h-[46px] rounded-xl border-[#DDD0A8] bg-[#FFFBF4]" />
      </div>

      {/* Consent Box */}
      <label className="flex items-start gap-3.5 rounded-[16px] border border-[#DDD0A8]/70 bg-[#FFFBF4] p-4 select-none cursor-pointer transition-colors hover:bg-[#FFF9ED]">
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(e) => setConsentAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[#DDD0A8] text-[#1A1609] focus:ring-[#1A1609] bg-white cursor-pointer"
        />
        <span className="text-[13.5px] leading-relaxed text-[#6B5E3E] font-medium">
          I consent to RoadRescue using my account details, location parameters, and rescue telemetry to deliver network services, emergency dispatches, notifications, and active support layers.
        </span>
      </label>

      <Button
        type="submit"
        className="w-full h-[52px] bg-[#1A1609] text-sm font-black uppercase tracking-wide text-white hover:bg-[#2A2211] py-3 rounded-xl transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-40"
        disabled={loading || !consentAccepted}
      >
        {loading ? 'Creating account...' : isMechanic ? 'Submit Mechanic Registration' : 'Submit Driver Registration'}
      </Button>

      <div className="my-4 flex items-center justify-center gap-3">
        <div className="h-[1px] flex-1 bg-slate-200"></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or</span>
        <div className="h-[1px] flex-1 bg-slate-200"></div>
      </div>

      <button
        type="button"
        onClick={() => toast('Coming soon, register manually.', { icon: <Info size={16} className="text-amber-600" /> })}
        className="flex w-full h-[50px] items-center justify-center rounded-[12px] border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] cursor-pointer"
      >
        <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>
    </form>
  )
}