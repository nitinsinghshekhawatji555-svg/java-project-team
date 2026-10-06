'use client'

import { useContext } from 'react'
import { MechanicVerificationContext } from '@/providers/MechanicVerificationProvider'

const DEFAULT_VERIFICATION_STATE = {
  verificationStatus: 'unverified',
  rejectionReason: null,
  isSuspended: false,
  suspensionReason: null,
  isApproved: false,
  isRejected: false,
  isPending: false,
  isUnverified: true,
  loading: false,
  error: null,
  refetch: async () => {},
}

/**
 * useMechanicVerificationAccess
 * 
 * Consumer hook that reads from the single MechanicVerificationProvider.
 * Never creates duplicate realtime channels or triggers subscription race conditions.
 */
export function useMechanicVerificationAccess() {
  const context = useContext(MechanicVerificationContext)
  if (!context) {
    return DEFAULT_VERIFICATION_STATE
  }
  return context
}
