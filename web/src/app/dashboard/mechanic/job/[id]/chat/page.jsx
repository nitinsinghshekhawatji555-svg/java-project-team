'use client'

import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import RescueChatPanel from '@/components/request/RescueChatPanel'

export default function MechanicJobChatPage() {
  const { id } = useParams()
  const { profile } = useAuth()

  return (
    <RescueChatPanel
      requestId={id}
      contactName={profile?.full_name || 'Driver'}
      contactRole="Driver"
      statusText={`Job #${id} · Live`}
      statusTone="success"
    />
  )
}