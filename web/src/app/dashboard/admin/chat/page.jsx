'use client'

import RescueChatPanel from '@/components/request/RescueChatPanel'

export default function AdminChatPage() {
  return (
    <RescueChatPanel
      contactName="Dispatch"
      contactRole="Control center"
      statusText="Platform coordination console"
      statusTone="warning"
    />
  )
}