'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { 
  Camera, ImagePlus, Wrench, Truck, Disc, Zap, Fuel, HelpCircle, 
  UserCheck, X, MapPin, Star, Compass, AlertTriangle, CheckCircle2,
  ChevronRight, ChevronLeft, Send, Sparkles, Car, ShieldAlert, Check
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import DiagnosticResult from '@/components/ai/DiagnosticResult'
import { useDiagnostic } from '@/hooks/useDiagnostic'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { SERVICE_TYPE } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRequestStore } from '@/stores/useRequestStore'

const serviceOptions = [
  { value: SERVICE_TYPE.REPAIR, label: 'General Repair', icon: Wrench, description: 'Engine diagnostics, mechanical, or electrical failures' },
  { value: SERVICE_TYPE.TOWING, label: 'Towing & Recovery', icon: Truck, description: 'Flatbed towing to nearest service center' },
  { value: SERVICE_TYPE.TYRE_CHANGE, label: 'Tyre Change', icon: Disc, description: 'Puncture repair or spare tyre installation' },
  { value: SERVICE_TYPE.BATTERY_JUMP, label: 'Battery Jump', icon: Zap, description: 'Jumpstart or battery performance diagnostics' },
  { value: SERVICE_TYPE.FUEL_DELIVERY, label: 'Fuel Delivery', icon: Fuel, description: 'Emergency petrol or diesel top-up delivery' },
  { value: SERVICE_TYPE.OTHER, label: 'Other Assistance', icon: HelpCircle, description: 'Vehicle lockouts or unspecified distress assistance' },
]

export default function RequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlMechanicId = searchParams.get('mechanicId') || null

  const { toast } = useToast()
  const { diagnose, diagnosing } = useDiagnostic()
  const { profile } = useAuth()

  const store = useRequestStore()
  const {
    currentStep,
    incidentLat,
    incidentLng,
    incidentAddress,
    serviceType,
    problemDescription,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    vehiclePlate,
    preferredMechanicId,
    aiDiagnosticResult,
    setStep,
    updateField,
    updateFields,
    setDiagnosticResult,
    resetForm,
  } = store

  const [mounted, setMounted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [snapshotUploading, setSnapshotUploading] = useState(false)
  const [vehicleImageFile, setVehicleImageFile] = useState(null)
  const [vehicleImagePreview, setVehicleImagePreview] = useState('')
  const [selectedMechanic, setSelectedMechanic] = useState(null)
  const [loadingMechanic, setLoadingMechanic] = useState(false)

  // Validation errors state per field
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setMounted(true)
    if (urlMechanicId) {
      updateField('preferredMechanicId', urlMechanicId)
    }
  }, [urlMechanicId, updateField])

  const [locationDetecting, setLocationDetecting] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [manualAddressInput, setManualAddressInput] = useState('')
  const [manualGeocoding, setManualGeocoding] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [showOfflineModal, setShowOfflineModal] = useState(false)

  // Reverse geocoding helper
  const reverseGeocode = useCallback(async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      )
      if (!response.ok) return null
      const data = await response.json()
      return data?.display_name || null
    } catch (error) {
      console.warn('Reverse geocoding failed:', error)
      return null
    }
  }, [])

  // Geolocation detector
  const detectLocation = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!navigator.geolocation) {
      setLocationError('Browser geolocation is not supported on this device. Please enter your address manually.')
      setShowManualInput(true)
      return
    }

    setLocationDetecting(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = Number(position.coords.latitude.toFixed(6))
        const nextLng = Number(position.coords.longitude.toFixed(6))

        const geocodedAddress = await reverseGeocode(nextLat, nextLng)
        const label = geocodedAddress || `${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}`

        updateFields({
          incidentLat: nextLat,
          incidentLng: nextLng,
          incidentAddress: label,
        })
        setManualAddressInput(label)
        setLocationDetecting(false)
        setShowManualInput(false)
        setErrors((prev) => ({ ...prev, location: null }))
        toast({ id: 'gps-toast', message: 'GPS coordinates detected successfully', type: 'success' })
      },
      (error) => {
        console.warn('Geolocation sensor error:', error.message)
        setLocationDetecting(false)
        setShowManualInput(true)
        setLocationError(
          error.code === 1
            ? 'Location permission denied. Please enter your pickup address manually below.'
            : 'Could not resolve your GPS signal. Please enter your address manually below.'
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [reverseGeocode, toast, updateFields])

  // Auto-detect location on initial load if not yet stored
  useEffect(() => {
    if (mounted && (!incidentLat || !incidentLng)) {
      detectLocation()
    }
  }, [mounted, incidentLat, incidentLng, detectLocation])

  // Sync initial manual address input if available
  useEffect(() => {
    if (incidentAddress && !manualAddressInput) {
      setManualAddressInput(incidentAddress)
    }
  }, [incidentAddress, manualAddressInput])

  // Manual address resolver
  const resolveManualAddress = async () => {
    if (!manualAddressInput.trim()) {
      toast({ message: 'Please enter a valid address or landmark name', type: 'warning' })
      return
    }

    setManualGeocoding(true)
    setLocationError(null)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          manualAddressInput.trim() + ', Ghana'
        )}&limit=1`,
        { headers: { Accept: 'application/json' } }
      )

      if (!response.ok) throw new Error('Geocoding query failed')
      const results = await response.json()

      if (!results || results.length === 0) {
        const retryRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            manualAddressInput.trim()
          )}&limit=1`,
          { headers: { Accept: 'application/json' } }
        )
        const retryResults = await retryRes.json()
        if (!retryResults || retryResults.length === 0) {
          throw new Error('Could not find coordinates for this location. Please try a more specific address or landmark.')
        }
        const match = retryResults[0]
        const lat = Number(parseFloat(match.lat).toFixed(6))
        const lng = Number(parseFloat(match.lon).toFixed(6))
        updateFields({
          incidentLat: lat,
          incidentLng: lng,
          incidentAddress: match.display_name || manualAddressInput.trim(),
        })
        setErrors((prev) => ({ ...prev, location: null }))
        toast({ message: 'Location resolved successfully', type: 'success' })
        return
      }

      const match = results[0]
      const lat = Number(parseFloat(match.lat).toFixed(6))
      const lng = Number(parseFloat(match.lon).toFixed(6))
      updateFields({
        incidentLat: lat,
        incidentLng: lng,
        incidentAddress: match.display_name || manualAddressInput.trim(),
      })
      setErrors((prev) => ({ ...prev, location: null }))
      toast({ message: 'Location resolved successfully', type: 'success' })
    } catch (err) {
      setLocationError(err.message || 'Unable to resolve coordinates for this address.')
      toast({ message: err.message || 'Failed to locate address', type: 'error' })
    } finally {
      setManualGeocoding(false)
    }
  }

  // Load preferred mechanic details
  useEffect(() => {
    const activeMechId = preferredMechanicId || urlMechanicId
    if (!activeMechId) {
      setSelectedMechanic(null)
      return
    }
    async function loadSelectedMechanic() {
      setLoadingMechanic(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('mechanic_public')
        .select('user_id, business_name, specializations, rating_avg, location_label')
        .eq('user_id', activeMechId)
        .maybeSingle()

      if (!error && data) {
        setSelectedMechanic(data)
      }
      setLoadingMechanic(false)
    }
    loadSelectedMechanic()
  }, [preferredMechanicId, urlMechanicId])

  // Prepopulate saved vehicle profile from database if fields are empty
  useEffect(() => {
    async function loadDriverVehicleProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate')
        .eq('user_id', user.id)
        .maybeSingle()

      if (driverProfile) {
        updateFields({
          vehicleMake: vehicleMake || driverProfile.vehicle_make || '',
          vehicleModel: vehicleModel || driverProfile.vehicle_model || '',
          vehicleYear: vehicleYear || (driverProfile.vehicle_year ? String(driverProfile.vehicle_year) : ''),
          vehicleColor: vehicleColor || driverProfile.vehicle_color || '',
          vehiclePlate: vehiclePlate || driverProfile.vehicle_plate || '',
        })
      }
    }

    if (mounted && !vehicleMake && !vehicleModel) {
      loadDriverVehicleProfile()
    }
  }, [mounted, vehicleMake, vehicleModel, vehicleYear, vehicleColor, vehiclePlate, updateFields])

  function onVehicleSnapshotChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      setVehicleImageFile(null)
      setVehicleImagePreview('')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast({ message: 'Please choose an image file', type: 'warning' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ message: 'Snapshot must be 10MB or less', type: 'warning' })
      return
    }

    if (vehicleImagePreview) {
      URL.revokeObjectURL(vehicleImagePreview)
    }

    setVehicleImageFile(file)
    setVehicleImagePreview(URL.createObjectURL(file))
  }

  async function uploadVehicleSnapshot() {
    if (!vehicleImageFile) return null

    const supabase = createClient()
    if (!supabase?.storage?.from) {
      throw new Error('Snapshot upload is unavailable in this environment')
    }

    setSnapshotUploading(true)

    try {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id || 'driver'
      const fileExtension = vehicleImageFile.name.split('.').pop() || 'jpg'
      const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`

      const { error: uploadError } = await supabase.storage
        .from('vehicle-snapshots')
        .upload(filePath, vehicleImageFile, {
          upsert: false,
          contentType: vehicleImageFile.type,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from('vehicle-snapshots')
        .getPublicUrl(filePath)

      return publicUrlData?.publicUrl || null
    } finally {
      setSnapshotUploading(false)
    }
  }

  // AI Diagnosis tool
  async function runDiagnostic() {
    if (!problemDescription.trim()) {
      setErrors((prev) => ({ ...prev, problemDescription: 'Describe the issue first before running AI diagnostic' }))
      toast({ message: 'Describe the issue first', type: 'warning' })
      return
    }

    const res = await diagnose({
      symptoms: problemDescription,
      vehicleMake: vehicleMake,
      vehicleModel: vehicleModel,
      vehicleYear: vehicleYear,
    })

    if (!res) {
      toast({ message: 'AI Diagnosis failed. Please try again.', type: 'error' })
    } else {
      setDiagnosticResult(res)
      toast({ message: 'AI Diagnosis completed successfully!', type: 'success' })
    }
  }

  // Step Validation logic
  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!incidentLat || !incidentLng) {
        newErrors.location = 'A verified pickup location is required to proceed.'
      }
    } else if (step === 2) {
      if (!vehicleMake.trim()) {
        newErrors.vehicleMake = 'Vehicle make is required (e.g. Toyota)'
      }
      if (!vehicleModel.trim()) {
        newErrors.vehicleModel = 'Vehicle model is required (e.g. Corolla)'
      }
      if (!problemDescription.trim() || problemDescription.trim().length < 8) {
        newErrors.problemDescription = 'Please describe the breakdown in at least 8 characters'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Final Dispatch Submission
  async function submitRequest(overridePreferredMechId = undefined) {
    if (!incidentLat || !incidentLng) {
      setStep(1)
      setErrors({ location: 'A verified pickup location is required before submitting your rescue request.' })
      toast({ message: 'Location required: Please lock in your pickup location.', type: 'error' })
      return
    }

    if (!vehicleMake.trim() || !vehicleModel.trim() || !problemDescription.trim() || problemDescription.trim().length < 8) {
      setStep(2)
      validateStep(2)
      toast({ message: 'Please complete all required vehicle and issue fields', type: 'warning' })
      return
    }

    setSubmitting(true)
    try {
      let vehicleImageUrl = null
      try {
        vehicleImageUrl = await uploadVehicleSnapshot()
      } catch (uploadError) {
        toast({
          message: uploadError.message || 'Snapshot upload failed. Dispatch will continue without image.',
          type: 'warning',
        })
      }

      const activeMechId = overridePreferredMechId !== undefined ? overridePreferredMechId : preferredMechanicId

      const payload = {
        incidentLat,
        incidentLng,
        incidentAddress,
        serviceType,
        problemDescription,
        vehicleMake,
        vehicleModel,
        vehicleYear: vehicleYear ? Number(vehicleYear) : null,
        vehicleColor,
        vehiclePlate,
        preferredMechanicId: activeMechId,
        aiDiagnosticResult: aiDiagnosticResult,
        vehicle_image_url: vehicleImageUrl,
      }

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      // Handle 409 PROVIDER_OFFLINE
      if (response.status === 409 && data.code === 'PROVIDER_OFFLINE') {
        setShowOfflineModal(true)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Unable to send request')
      }

      // Clear cached form state on successful dispatch
      resetForm()
      toast({ message: 'Dispatch sent. Matching mechanic...', type: 'success' })
      router.push(`/dashboard/driver/request/${data.request.id}`)
    } catch (error) {
      toast({ message: error.message || 'Failed to submit request', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmBroadcast = async () => {
    setShowOfflineModal(false)
    setSelectedMechanic(null)
    updateField('preferredMechanicId', null)
    await submitRequest(null)
  }

  if (!mounted) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const selectedServiceObj = serviceOptions.find(s => s.value === serviceType) || serviceOptions[0]
  const ServiceIcon = selectedServiceObj.icon

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      
      {/* 3-STEP PROGRESS STEPPER */}
      <div className="rounded-2xl border border-[#DCCDA9] bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Location & Target' },
            { num: 2, label: 'Vehicle & Issue' },
            { num: 3, label: 'Review & Dispatch' },
          ].map((s, idx) => {
            const isCompleted = currentStep > s.num
            const isCurrent = currentStep === s.num
            return (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep) setStep(s.num)
                    else if (s.num > currentStep && validateStep(currentStep)) setStep(s.num)
                  }}
                  className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-none min-h-[44px] py-1"
                >
                  <div
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0 flex items-center justify-center font-black text-xs transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-slate-900 text-white ring-4 ring-slate-100 shadow-sm'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}
                  >
                    {isCompleted ? <Check size={15} strokeWidth={3} className="shrink-0" /> : <span className="leading-none">{s.num}</span>}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-wider leading-none ${
                      isCurrent ? 'text-amber-700' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                    }`}>
                      Step {s.num}
                    </p>
                    <p className={`text-xs font-bold leading-tight mt-0.5 truncate ${
                      isCurrent ? 'text-slate-900' : 'text-slate-500'
                    }`}>
                      {s.label}
                    </p>
                  </div>
                </button>

                {idx < 2 && (
                  <div className={`mx-1.5 sm:mx-3 h-0.5 flex-1 rounded-full transition-colors shrink ${
                    currentStep > s.num ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* STEP 1: LOCATION & ASSISTANCE TARGET */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Target Preferred Mechanic Badge if selected */}
          {selectedMechanic ? (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <UserCheck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Preferred Mechanic (Targeted Dispatch)
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5 truncate">
                    {selectedMechanic.business_name || 'Selected Certified Mechanic'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-amber-700">
                    {selectedMechanic.location_label && (
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin size={11} className="text-amber-600 shrink-0" />
                        <span className="truncate">{selectedMechanic.location_label}</span> •
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 font-bold shrink-0">
                      <Star size={11} className="text-amber-500 fill-amber-500" />
                      {selectedMechanic.rating_avg ? Number(selectedMechanic.rating_avg).toFixed(1) : '5.0'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedMechanic(null)
                  updateField('preferredMechanicId', null)
                }}
                leftIcon={<X size={14} />}
                className="h-8 px-3 text-xs border-amber-200 text-amber-900 hover:bg-amber-100/80 shadow-xs shrink-0 self-end sm:self-center"
                title="Reset to broadcast mode"
              >
                Clear
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <ShieldAlert size={16} className="text-slate-500 shrink-0" />
                <span className="text-xs text-slate-700 font-medium leading-tight">
                  Dispatch Mode: <strong className="font-black text-slate-900">Broadcast nearby</strong>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/driver/explore')}
                className="h-8 text-xs px-3 rounded-xl border-slate-300 hover:bg-white shrink-0 font-bold"
              >
               Pick mechanic 
              </Button>
            </div>
          )}

          {/* Incident Location Capture */}
          <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-sm">
            <div className="border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#1F1B10]">Pickup Location</h3>
              {incidentLat && incidentLng && (
                <Badge variant="verified" icon={<CheckCircle2 size={13} />} className="text-xs">
                  Location Locked
                </Badge>
              )}
            </div>

            <div className="p-4 space-y-3">
              {incidentLat && incidentLng ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Confirmed Pickup Address
                        </p>
                        <p className="text-xs font-bold text-slate-900 leading-snug mt-0.5 break-words">
                          {incidentAddress || `${incidentLat.toFixed(4)}, ${incidentLng.toFixed(4)}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => setShowManualInput((prev) => !prev)}
                            className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer py-1"
                          >
                            {showManualInput ? 'Close Edit' : 'Edit Address'}
                          </button>
                          <button
                            type="button"
                            onClick={detectLocation}
                            disabled={locationDetecting}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1"
                          >
                            <Compass size={13} className={locationDetecting ? 'animate-spin text-amber-600' : ''} />
                            <span>Re-detect GPS</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dashboard/driver/explore')}
                      leftIcon={<Compass size={13} />}
                      className="h-8 px-3 rounded-xl border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100/60 shrink-0 self-end sm:self-start"
                      title="Choose from discovery map"
                    >
                      Change Map
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center space-y-3">
                  <div className="mx-auto h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Compass size={22} className={locationDetecting ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {locationDetecting ? 'Acquiring GPS Satellite Fix...' : 'Awaiting Incident Location'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                      Your browser GPS coordinates are needed so nearby dispatchers know where to find you.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="warning"
                      size="sm"
                      onClick={detectLocation}
                      disabled={locationDetecting}
                      leftIcon={<Compass size={14} className={locationDetecting ? 'animate-spin' : ''} />}
                      className="h-10 px-4 text-xs font-black uppercase tracking-wider"
                    >
                      {locationDetecting ? 'Detecting...' : 'Detect Location'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowManualInput((prev) => !prev)}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 underline underline-offset-2 cursor-pointer px-3 py-2 min-h-[44px] flex items-center"
                    >
                      Enter Manually
                    </button>
                  </div>
                </div>
              )}

              {/* Reserved inline error space for location validation */}
              <div className="min-h-[20px]">
                {(locationError || errors.location) && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="font-medium leading-tight">{locationError || errors.location}</p>
                  </div>
                )}
              </div>

              {/* Manual address search expansion */}
              {showManualInput && (
                <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600">
                    Manual Address / Landmark Name
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={manualAddressInput}
                      onChange={(e) => setManualAddressInput(e.target.value)}
                      placeholder="e.g. Near Accra Mall, Tetteh Quarshie Interchange"
                      className="flex-1 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={resolveManualAddress}
                      disabled={manualGeocoding || !manualAddressInput.trim()}
                      className="h-11 px-4 text-xs font-bold border-slate-300 hover:bg-slate-50 shrink-0"
                    >
                      {manualGeocoding ? 'Locating...' : 'Set Location'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Type your street name or landmark to search and lock in coordinates.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 1 NAVIGATION */}
          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
              variant="dark"
              size="md"
              onClick={handleNext}
              rightIcon={<ChevronRight size={16} />}
              className="text-xs font-black uppercase tracking-wider px-6"
            >
              Continue to Vehicle Details
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: VEHICLE & SYMPTOM DIAGNOSTICS */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* VEHICLE DETAILS CARD */}
          <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-sm">
            <div className="border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1F1B10]">Vehicle Information</h3>
              <span className="text-[11px] font-bold text-slate-400">Make & Model required</span>
            </div>
            
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <Input 
                  label="Make *" 
                  value={vehicleMake} 
                  onChange={(e) => {
                    updateField('vehicleMake', e.target.value)
                    if (errors.vehicleMake) setErrors(prev => ({ ...prev, vehicleMake: null }))
                  }} 
                  placeholder="e.g. Toyota" 
                />
                <div className="min-h-[16px] mt-1">
                  {errors.vehicleMake && (
                    <p className="text-[11px] font-medium text-red-600 leading-tight">{errors.vehicleMake}</p>
                  )}
                </div>
              </div>

              <div>
                <Input 
                  label="Model *" 
                  value={vehicleModel} 
                  onChange={(e) => {
                    updateField('vehicleModel', e.target.value)
                    if (errors.vehicleModel) setErrors(prev => ({ ...prev, vehicleModel: null }))
                  }} 
                  placeholder="e.g. Corolla" 
                />
                <div className="min-h-[16px] mt-1">
                  {errors.vehicleModel && (
                    <p className="text-[11px] font-medium text-red-600 leading-tight">{errors.vehicleModel}</p>
                  )}
                </div>
              </div>

              <div>
                <Input 
                  label="Year" 
                  type="number" 
                  value={vehicleYear} 
                  onChange={(e) => updateField('vehicleYear', e.target.value)} 
                  placeholder="e.g. 2018" 
                />
                <div className="min-h-[16px] mt-1" />
              </div>

              <div>
                <Input 
                  label="Color" 
                  value={vehicleColor} 
                  onChange={(e) => updateField('vehicleColor', e.target.value)} 
                  placeholder="e.g. Silver" 
                />
                <div className="min-h-[16px] mt-1" />
              </div>

              <div className="sm:col-span-2">
                <Input 
                  label="Plate Number" 
                  value={vehiclePlate} 
                  onChange={(e) => updateField('vehiclePlate', e.target.value)} 
                  placeholder="e.g. GR-1234-24" 
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-700">
                  Vehicle Camera Snapshot (Optional)
                </label>
                <label className="group flex cursor-pointer flex-col gap-3 rounded-2xl border-2 border-dashed border-[#DDD0A8] bg-[#FFFDF9] p-5 transition-all duration-200 hover:border-[#1F1B10] hover:bg-[#FFFBF4]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onVehicleSnapshotChange}
                    className="sr-only"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-[#1F1B10] p-3 text-white transition-transform group-hover:scale-105">
                        <Camera size={20} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1F1B10]">Tap to upload or take a snapshot</p>
                        <p className="text-xs text-[#7C6B44] leading-relaxed mt-0.5">Helps your mechanic prepare parts and reduces wait times.</p>
                      </div>
                    </div>
                    <ImagePlus size={20} className="text-[#B8A06A] transition-colors group-hover:text-[#1F1B10]" />
                  </div>

                  {vehicleImagePreview && (
                    <div className="overflow-hidden rounded-xl border border-[#E0D5B7] bg-white">
                      <Image
                        src={vehicleImagePreview}
                        alt="Vehicle snapshot preview"
                        width={1024}
                        height={768}
                        unoptimized
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* SERVICE TYPE & SYMPTOMS CARD */}
          <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-sm">
            <div className="border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1F1B10]">Breakdown Description</h3>
              <span className="text-[11px] font-bold text-slate-400">Service & Symptoms</span>
            </div>
            
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#7C6B44]">
                  Service Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {serviceOptions.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = serviceType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField('serviceType', opt.value)}
                        className={`flex items-start gap-3.5 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-xs'
                            : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50/85'
                        }`}
                      >
                        <div className={`rounded-xl p-2.5 transition-colors shrink-0 ${
                          isSelected ? 'bg-[#1F1B10] text-primary' : 'bg-slate-200/60 text-slate-600'
                        }`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold transition-colors leading-snug ${
                            isSelected ? 'text-[#1F1B10]' : 'text-slate-800'
                          }`}>
                            {opt.label}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <Textarea
                  label="What is happening? *"
                  value={problemDescription}
                  onChange={(e) => {
                    updateField('problemDescription', e.target.value)
                    if (errors.problemDescription) setErrors(prev => ({ ...prev, problemDescription: null }))
                  }}
                  placeholder="Describe warning lights, strange noises, smoke, or sudden component failures..."
                  hint="Detailed descriptions improve the precision of the AI diagnostic engine."
                />
                <div className="min-h-[16px] mt-1">
                  {errors.problemDescription && (
                    <p className="text-[11px] font-medium text-red-600 leading-tight">{errors.problemDescription}</p>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={runDiagnostic}
                  disabled={diagnosing}
                  leftIcon={<Sparkles size={14} className={diagnosing ? 'animate-spin text-amber-500' : 'text-amber-600'} />}
                  className="border-slate-900 bg-white text-xs font-black uppercase tracking-wider text-slate-900 shadow-xs"
                >
                  {diagnosing ? 'Analyzing parameters...' : 'Run AI Diagnosis'}
                </Button>
              </div>

              {aiDiagnosticResult && <DiagnosticResult diagnosis={aiDiagnosticResult} />}
            </div>
          </div>

          {/* STEP 2 NAVIGATION */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              leftIcon={<ChevronLeft size={16} />}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4"
            >
              Back 
            </Button>

            <Button
              type="button"
              variant="dark"
              size="md"
              onClick={handleNext}
              rightIcon={<ChevronRight size={16} />}
              className="text-xs font-black uppercase tracking-wider px-6"
            >
              Review & Dispatch
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & DISPATCH */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div className="overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-sm">
            <div className="border-b border-[#E0D5B7] bg-[#FFF9EF] px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1F1B10]">Review Breakdown Summary</h3>
              <span className="text-[11px] font-bold text-slate-400">Final Verification</span>
            </div>

            <div className="p-4 space-y-4">
              
              {/* Pickup Point Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight">
                      Pickup Location
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 leading-snug break-words">
                      {incidentAddress || `${incidentLat?.toFixed(4)}, ${incidentLng?.toFixed(4)}`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">
                      GPS: {incidentLat?.toFixed(5)}, {incidentLng?.toFixed(5)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer shrink-0 py-1 px-1.5 min-h-[36px] flex items-center"
                >
                  Edit
                </button>
              </div>

              {/* Target Provider Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight">
                      Dispatch Target
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 leading-snug truncate">
                      {selectedMechanic ? selectedMechanic.business_name : 'All Nearby Verified Mechanics'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      {selectedMechanic ? 'Targeted request sent directly to selected provider' : 'Broadcasts to all online mechanics in your zone'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer shrink-0 py-1 px-1.5 min-h-[36px] flex items-center"
                >
                  Edit
                </button>
              </div>

              {/* Vehicle Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Car size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight">
                      Vehicle Profile
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                      {vehicleYear ? `${vehicleYear} ` : ''}{vehicleMake} {vehicleModel}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      {vehicleColor && `Color: ${vehicleColor} • `}{vehiclePlate ? `Plate: ${vehiclePlate}` : 'No plate specified'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer shrink-0 py-1 px-1.5 min-h-[36px] flex items-center"
                >
                  Edit
                </button>
              </div>

              {/* Service & Issue Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-xl bg-primary text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                    <ServiceIcon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight">
                      {selectedServiceObj.label}
                    </span>
                    <p className="text-xs text-slate-800 mt-1 leading-relaxed font-medium break-words">
                      &quot;{problemDescription}&quot;
                    </p>
                    {aiDiagnosticResult && (
                      <div className="mt-2 rounded-lg bg-amber-100/60 border border-amber-200 p-2 text-[11px] text-amber-900">
                        <span className="font-black text-[10px] uppercase tracking-wider block">AI Diagnosis Attached:</span>
                        <p className="mt-0.5 font-medium leading-snug">{aiDiagnosticResult.diagnosis || aiDiagnosticResult.summary || 'Summary attached'}</p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer shrink-0 py-1 px-1.5 min-h-[36px] flex items-center"
                >
                  Edit
                </button>
              </div>

            </div>
          </div>

          {/* FINAL SUBMIT BUTTON & CONTROLS */}
          <div className="space-y-3 pt-2">
            <Button 
              fullWidth 
              size="lg" 
              variant="dark"
              onClick={() => submitRequest()} 
              loading={submitting} 
              disabled={submitting || snapshotUploading}
              leftIcon={<Send size={15} />}
              className="text-xs font-black uppercase tracking-widest py-4 shadow-md disabled:opacity-40"
            >
              {submitting || snapshotUploading ? 'Broadcasting Emergency Dispatch...' : 'Confirm & Send Request'}
            </Button>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleBack}
                leftIcon={<ChevronLeft size={16} />}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4"
              >
                Back to Vehicle & Issue
              </Button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear your request details?')) {
                    resetForm()
                    toast({ message: 'Request form cleared', type: 'info' })
                  }
                }}
                className="text-xs text-slate-400 hover:text-red-600 underline cursor-pointer py-2 min-h-[44px] flex items-center"
              >
                Cancel & Clear Form
              </button>
            </div>
          </div>

        </div>
      )}

      {/* CONFIRMATION DIALOG: PROVIDER OFFLINE (409) FALLBACK TO BROADCAST */}
      <Modal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        title="Mechanic Unavailable"
        size="sm"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOfflineModal(false)}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmBroadcast}
              className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-primary hover:bg-primary/90 shadow-sm cursor-pointer px-4"
            >
              Broadcast Nearby
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-[#FFF9EF] border border-[#E8DCC0] p-3 text-xs text-[#6C5E3B] font-medium leading-relaxed">
            <strong>{selectedMechanic?.business_name || 'Selected provider'}</strong> went offline or is engaged. Broadcast to all active responders within your zone?
          </div>
        </div>
      </Modal>
      
    </div>
  )
}