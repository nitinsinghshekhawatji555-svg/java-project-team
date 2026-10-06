'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useMechanicVerificationAccess } from '@/hooks/useMechanicVerificationAccess'
import CoachMark from '@/components/onboarding/coach-mark'

export default function MechanicTour() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const {
    loading: onboardingLoading,
    shouldShow,
    hasActiveRequest,
    dismiss,
  } = useOnboarding('mechanic_v1')

  const {
    verificationStatus,
    rejectionReason,
    isSuspended,
    isApproved,
    isRejected,
    isPending,
    isUnverified,
    loading: verificationLoading,
  } = useMechanicVerificationAccess(user?.id)

  // 1. Compute dynamic steps array based on current live verification status
  const steps = useMemo(() => {
    // Step A: Welcome Card
    let welcomeBadge = null
    let welcomeMessage = ''

    if (isApproved) {
      welcomeBadge = (
        <span className="rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
          Verified Active
        </span>
      )
      welcomeMessage =
        'Welcome to RoadRescue! Your profile is verified and active. You can now toggle your duty status to Online to accept incoming rescue requests.'
    } else if (isPending) {
      welcomeBadge = (
        <span className="rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
          Under Review
        </span>
      )
      welcomeMessage =
        'Welcome to RoadRescue. Your verification is under review. Our team is reviewing your credentials. You cannot accept rescue requests until approved.'
    } else if (isRejected) {
      welcomeBadge = (
        <span className="rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
          Action Required
        </span>
      )
      welcomeMessage = `Verification Update: Your submission was not approved.${
        rejectionReason ? ` Reason: "${rejectionReason}".` : ''
      } Please review and upload updated documents.`
    } else {
      // Unverified / never submitted
      welcomeBadge = (
        <span className="rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
          Unverified
        </span>
      )
      welcomeMessage =
        'Welcome to RoadRescue. Your profile is not yet verified. Submit your credentials to start receiving emergency requests.'
    }

    const stepA = {
      id: 'welcome',
      targetSelector: '[data-tour="mechanic-welcome"]',
      isCentered: false,
      title: 'Mechanic Console',
      badge: welcomeBadge,
      message: welcomeMessage,
      nextLabel: 'Next',
    }

    // Step B: Profile Navigation Item
    const stepB = {
      id: 'profile-nav',
      targetSelector: '[data-tour="mechanic-nav-profile"]',
      title: 'Your Mechanic Profile',
      badge: null,
      message:
        'Manage your business details, hourly rate, and service areas from your Profile.',
      nextLabel: (isUnverified || isRejected) ? 'Next' : 'Got it',
    }

    // Step C: Credentials Submission (ONLY for unverified or rejected)
    if (isUnverified || isRejected) {
      const stepC = {
        id: 'credentials',
        targetSelector: '[data-tour="mechanic-credentials-section"]',
        title: isRejected ? 'Update Credentials' : 'Upload Credentials',
        badge: welcomeBadge,
        message: isRejected
          ? `Upload updated credentials to resolve the issue: ${
              rejectionReason || 'Please provide clear identity documents'
            }.`
          : 'Upload your government ID, workshop certification, or business registration here for admin verification.',
        nextLabel: 'Finish',
      }
      return [stepA, stepB, stepC]
    }

    return [stepA, stepB]
  }, [isApproved, isPending, isRejected, isUnverified, rejectionReason])

  // If status changes mid-tour and reduces steps count, clamp current index
  useEffect(() => {
    if (currentStepIndex >= steps.length) {
      setCurrentStepIndex(Math.max(0, steps.length - 1))
    }
  }, [steps.length, currentStepIndex])

  // Suspended mechanics or active emergency jobs must NEVER show the tour
  if (
    onboardingLoading ||
    verificationLoading ||
    !shouldShow ||
    isSuspended ||
    hasActiveRequest
  ) {
    return null
  }

  const currentStep = steps[currentStepIndex] || steps[0]
  const isLastStep = currentStepIndex >= steps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      dismiss('mechanic_v1')
      return
    }

    const nextIndex = currentStepIndex + 1
    const nextStep = steps[nextIndex]

    // If next step targets credentials section and user is not on account page, navigate
    if (
      nextStep?.id === 'credentials' &&
      pathname !== '/dashboard/mechanic/account'
    ) {
      router.push('/dashboard/mechanic/account')
    }

    setCurrentStepIndex(nextIndex)
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const handleDismiss = () => {
    dismiss('mechanic_v1')
  }

  const handleTimeout = () => {
    // If a target element is not found within 1.5s, skip silently
    if (isLastStep) {
      dismiss('mechanic_v1')
    } else {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  return (
    <CoachMark
      isOpen={true}
      targetSelector={currentStep.targetSelector}
      isCentered={currentStep.isCentered}
      title={currentStep.title}
      badge={currentStep.badge}
      stepText={`Step ${currentStepIndex + 1} of ${steps.length}`}
      message={currentStep.message}
      nextLabel={isLastStep ? 'Got it' : currentStep.nextLabel || 'Next'}
      prevLabel={currentStepIndex > 0 ? 'Back' : null}
      onNext={handleNext}
      onPrev={handlePrev}
      onDismiss={handleDismiss}
      onTimeout={handleTimeout}
    />
  )
}
