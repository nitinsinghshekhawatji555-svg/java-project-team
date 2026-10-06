'use client'

import Modal from '@/components/ui/Modal'
import RescueChatPanel from '@/components/request/RescueChatPanel'

export default function RescueChatModal({
  isOpen,
  onClose,
  requestId,
  contactName,
  contactRole = 'Mechanic',
  statusText,
  initialStatus,
}) {
  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <div className="-mx-6 -my-4">
        <RescueChatPanel
          requestId={requestId}
          contactName={contactName}
          contactRole={contactRole}
          statusText={statusText}
          initialStatus={initialStatus}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </Modal>
  )
}
