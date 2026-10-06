'use client'

import Link from 'next/link'

import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ToggleChip from '@/components/ui/ToggleChip'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function AdminSettingsPage() {
  const [isEditing, setIsEditing] = useState(false)
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    enableNewRegistrations: true,
    requireMechanicVerification: true,
  })
  const [backupSettings, setBackupSettings] = useState(null)

  const startEditing = () => {
    setBackupSettings({ ...settings })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (backupSettings) {
      setSettings(backupSettings)
    }
    setIsEditing(false)
  }

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <PageWrapper 
      title="System Settings" 
      description="Configure platform-wide settings and system parameters."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-[#111827]">System Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-[#111827]">Maintenance Mode</label>
                <p className="text-sm text-[#7C7767]">Prevent new requests when enabled</p>
              </div>
              <ToggleChip
                label={settings.maintenanceMode ? "Active" : "Inactive"}
                checked={settings.maintenanceMode}
                readOnly={!isEditing}
                onChange={() => handleToggle('maintenanceMode')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-[#111827]">Enable New Registrations</label>
                <p className="text-sm text-[#7C7767]">Allow new users to register</p>
              </div>
              <ToggleChip
                label={settings.enableNewRegistrations ? "Allowed" : "Blocked"}
                checked={settings.enableNewRegistrations}
                readOnly={!isEditing}
                onChange={() => handleToggle('enableNewRegistrations')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-[#111827]">Require Mechanic Verification</label>
                <p className="text-sm text-[#7C7767]">Manual approval for mechanics</p>
              </div>
              <ToggleChip
                label={settings.requireMechanicVerification ? "Required" : "Optional"}
                checked={settings.requireMechanicVerification}
                readOnly={!isEditing}
                onChange={() => handleToggle('requireMechanicVerification')}
              />
            </div>
          </div>
          {!isEditing ? (
            <Button className="mt-6 w-full" onClick={startEditing}>Edit Configuration</Button>
          ) : (
            <div className="mt-6 flex gap-2.5">
              <Button variant="outline" className="flex-1" onClick={cancelEditing}>Cancel</Button>
              <Button className="flex-[2]" onClick={() => {
                toast.success('Configuration saved')
                setIsEditing(false)
              }}>Save Configuration</Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-[#111827]">Database & Backup</h2>
          <div className="space-y-4">
            <Button variant="outline" className="w-full">View Database Stats</Button>
            <Button variant="outline" className="w-full">Trigger Backup</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-[#111827]">Platform Security</h2>
          <div className="space-y-4">
            <Button variant="outline" className="w-full">View Audit Log</Button>
            <Button variant="outline" className="w-full">Manage API Keys</Button>
            <Button variant="outline" className="w-full">View Security Incidents</Button>
            <Link href="/dashboard/admin/reviews" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#111827] text-sm font-semibold text-[#F3F4F6]">
              Review pending edits
            </Link>
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}
