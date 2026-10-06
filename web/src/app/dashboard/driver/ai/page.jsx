'use client'

import DiagnosticChat from '@/components/ai/DiagnosticChat'

export default function DriverAiPage() {
  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden">
      <DiagnosticChat />
    </div>
  )
}