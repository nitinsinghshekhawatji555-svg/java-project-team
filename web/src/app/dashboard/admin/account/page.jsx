'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone, Shield, Lock, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react'

export default function AdminAccountPage() {
  const { user, profile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  })

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

  const resolvedFormData = {
    fullName: profile?.full_name || '',
    email: profile?.email || user?.email || '',
    phone: resolvePhoneNumber(profile, user),
  }

  const handleChange = (field, value) => {
    let cleanValue = value
    if (field === 'phone') {
      cleanValue = value.replace(/[^0-9+]/g, '')
    }
    setFormData(prev => ({ ...prev, [field]: cleanValue }))
  }

  const handleStartEditing = () => {
    setFormData(resolvedFormData)
    setIsEditing(true)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // Fixed: Targeted the unified 'profiles' table to prevent query execution breaks
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq('id', user?.id)

      if (error) throw error
      
      toast.success('Administrative credentials updated successfully')
      setIsEditing(false)
    } catch (error) {
      toast.error(error.message || 'Failed to sync administrative parameters')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <PageWrapper title="Operations Node">
        <div className="flex items-center justify-center py-12"><Spinner /></div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper 
      title="Account Settings" 
      description="Configure administrative profile parameters, inspect root infrastructure scopes, and manage terminal security."
    >
      <div className="mx-auto max-w-2xl space-y-5 pb-12">
        
        {/* ================= PRIMARY PROFILE DATA PARAMETERS ================= */}
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm relative">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              Operations Registry Profile
            </h2>
            {!isEditing ? (
              <Button 
                variant="outline" 
                className="h-8 rounded-lg px-3.5 text-xs font-bold uppercase tracking-wider border-slate-200 text-slate-700 bg-white"
                onClick={handleStartEditing}
              >
                Edit Parameters
              </Button>
            ) : (
              <div className="flex gap-1.5">
                <Button 
                  variant="outline" 
                  className="h-8 rounded-lg px-3 text-xs font-bold uppercase tracking-wider border-slate-200 text-slate-400 bg-white"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="h-8 rounded-lg px-3 text-xs font-bold uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800"
                  loading={loading}
                  onClick={handleSave}
                >
                  Save Sync
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-slate-400" /> Administrative User String
              </label>
              {isEditing ? (
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Full name string parameters"
                />
              ) : (
                <p className="text-sm font-bold text-slate-900">{resolvedFormData.fullName || 'Unconfigured Node Name'}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" /> Core System Routing Email
              </label>
              <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">{resolvedFormData.email || 'N/A'}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Locked infrastructure variables cannot be altered</p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" /> Dispatch Communication line
              </label>
              {isEditing ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+233..."
                />
              ) : (
                <p className="text-sm font-bold text-slate-900">{resolvedFormData.phone || 'Phone Number not set'}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Lock size={13} className="text-slate-400" /> Operational Security Group
              </label>
              <Badge label="System Administrator" variant="primary" />
            </div>
          </div>
        </Card>

        {/* ================= AUTHORITY CLEARANCES BLOCK ================= */}
        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm space-y-3.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-slate-50 pb-2">
            <ShieldCheck size={16} className="text-slate-500" />
            System Control Parameters
          </h3>
          <p className="text-xs font-medium leading-relaxed text-slate-500">
            Your identity maintains complete access clearance matrices across the global backend architecture, including:
          </p>
          <ul className="grid gap-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-100 p-4 rounded-xl">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> User framework management and validation vectors</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Emergency field technician credential moderation</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Realtime transit dispatch tracking & escalation channels</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Comprehensive platform analytics documentation</li>
          </ul>
        </Card>

        {/* ================= CRITICAL ACCOUNT SECURITY GATEWAY ================= */}
        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <KeyRound size={16} className="text-slate-400" />
            Account Token Cryptography
          </h3>
          <p className="text-xs font-medium leading-relaxed text-slate-500">
            This administrative node session is isolated with enterprise-grade system tokens.
          </p>
          <Button 
            variant="outline" 
            fullWidth
            className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider bg-white border-slate-200 hover:bg-slate-50 text-slate-700 mt-2"
          >
            Modify Password Matrix
          </Button>
        </Card>
      </div>
    </PageWrapper>
  )
}