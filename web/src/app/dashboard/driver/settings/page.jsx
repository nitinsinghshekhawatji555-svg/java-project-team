'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import ToggleChip from '@/components/ui/ToggleChip'
import toast from 'react-hot-toast'

export default function DriverSettingsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [preferences, setPreferences] = useState({
    theme: 'system',
    preferred_language: 'en',
    notification_preferences: { email: true, sms: true, push: true },
    communication_preferences: [],
    home_location_label: '',
    work_location_label: '',
    bio: '',
    secondary_phone: '',
  })

  async function loadPreferences() {
    try {
      const response = await fetch('/api/profile/preferences', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.preferences) return

      setPreferences({
        theme: payload.preferences.theme || 'System',
        preferred_language: payload.preferences.preferred_language || 'English',
        notification_preferences: payload.preferences.notification_preferences || { email: true, sms: true, push: true },
        communication_preferences: payload.preferences.communication_preferences || [],
        home_location_label: payload.preferences.home_location_label || '',
        work_location_label: payload.preferences.work_location_label || '',
        bio: payload.preferences.bio || '',
        secondary_phone: payload.preferences.secondary_phone || '',
      })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadPreferences()
  }, [])

  const updatePreference = (field, value) => {
    setPreferences((prev) => ({ ...prev, [field]: value }))
  }

  const toggleNotification = (field) => {
    setPreferences((prev) => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [field]: !prev.notification_preferences?.[field],
      },
    }))
  }

  const toggleCommunication = (value) => {
    setPreferences((prev) => ({
      ...prev,
      communication_preferences: prev.communication_preferences.includes(value)
        ? prev.communication_preferences.filter((item) => item !== value)
        : [...prev.communication_preferences, value],
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save preferences')

      toast.success('Preferences saved')
      setPreferences({
        theme: payload.preferences.theme,
        preferred_language: payload.preferences.preferred_language,
        notification_preferences: payload.preferences.notification_preferences,
        communication_preferences: payload.preferences.communication_preferences || [],
        home_location_label: payload.preferences.home_location_label || '',
        work_location_label: payload.preferences.work_location_label || '',
        bio: payload.preferences.bio || '',
        secondary_phone: payload.preferences.secondary_phone || '',
      })
      setIsEditing(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    loadPreferences()
    setIsEditing(false)
  }

  return (
    <PageWrapper 
      title="Settings" 
      description="Persist your theme, notifications, language, and communication preferences."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-[#111827]">Persistent Preferences</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Theme" value={preferences.theme} disabled={!isEditing} onChange={(e) => updatePreference('theme', e.target.value)} placeholder="system" />
            <Input label="Preferred language" value={preferences.preferred_language} disabled={!isEditing} onChange={(e) => updatePreference('preferred_language', e.target.value)} placeholder="en" />
            <Input label="Secondary phone" value={preferences.secondary_phone} disabled={!isEditing} onChange={(e) => updatePreference('secondary_phone', e.target.value)} placeholder="+233..." />
            <Input label="Home location" value={preferences.home_location_label} disabled={!isEditing} onChange={(e) => updatePreference('home_location_label', e.target.value)} placeholder="Accra" />
            <Input label="Work location" value={preferences.work_location_label} disabled={!isEditing} onChange={(e) => updatePreference('work_location_label', e.target.value)} placeholder="Office / home base" />
          </div>
          <div className="mt-4">
            <Textarea label="Bio / about" value={preferences.bio} disabled={!isEditing} onChange={(e) => updatePreference('bio', e.target.value)} rows={4} placeholder="Short bio for profile cards" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['email', 'sms', 'push'].map((field) => (
              <ToggleChip
                key={field}
                label={field}
                checked={preferences.notification_preferences?.[field]}
                readOnly={!isEditing}
                onChange={() => toggleNotification(field)}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['call', 'sms', 'whatsapp'].map((field) => (
              <ToggleChip
                key={field}
                label={field}
                checked={preferences.communication_preferences.includes(field)}
                readOnly={!isEditing}
                onChange={() => toggleCommunication(field)}
              />
            ))}
          </div>
          {!isEditing ? (
            <Button className="mt-6 w-full" onClick={() => setIsEditing(true)}>Edit Preferences</Button>
          ) : (
            <div className="mt-6 flex gap-2.5">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>Cancel</Button>
              <Button className="flex-[2]" loading={loading} onClick={handleSave}>Save preferences</Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-[#111827]">Security</h2>
          <div className="space-y-4">
            <Button variant="outline" className="w-full">Change Password</Button>
            <Button variant="outline" className="w-full">View Active Sessions</Button>
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}
