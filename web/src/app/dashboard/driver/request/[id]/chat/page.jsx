'use client'

import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import RescueChatPanel from '@/components/request/RescueChatPanel'

export default function DriverRescueChatPage() {
  const { id } = useParams()
  const { profile } = useAuth()

  return (
    <RescueChatPanel
      requestId={id}
      contactName={profile?.full_name || 'Assigned mechanic'}
      contactRole="Mechanic"
      statusText={`Request #${id} · Active`}
      statusTone="success"
    />
  )
}