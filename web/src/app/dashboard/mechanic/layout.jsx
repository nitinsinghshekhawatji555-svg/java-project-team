'use client'

import { MechanicVerificationProvider } from '@/providers/MechanicVerificationProvider'

export default function MechanicDashboardLayout({ children }) {
  return (
    <MechanicVerificationProvider>
      {children}
    </MechanicVerificationProvider>
  )
}
