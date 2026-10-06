'use client'

import { useState, useEffect } from 'react'

function isTextInputActive() {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  const isInput = tag === 'input' && ['text', 'email', 'tel', 'password', 'search', 'number', 'url'].includes(el.type)
  const isTextarea = tag === 'textarea'
  const isEditable = el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') !== 'false'
  return isInput || isTextarea || isEditable
}

function isViewportShrunk(threshold = 60) {
  if (typeof window === 'undefined' || !window.visualViewport) return false
  return (window.innerHeight - window.visualViewport.height) > threshold
}

/**
 * useKeyboardOpen
 * Real-time keyboard detection combining direct activeElement focus inspection 
 * and window.visualViewport resize telemetry.
 */
export function useKeyboardOpen(threshold = 60) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleCheck = () => {
      const active = isTextInputActive()
      const shrunk = isViewportShrunk(threshold)
      const open = active || shrunk

      setIsKeyboardOpen(open)
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('keyboard-open', open)
      }
    }

    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', handleCheck)
      vv.addEventListener('scroll', handleCheck)
    }

    const handleFocusIn = () => {
      handleCheck()
    }

    const handleFocusOut = () => {
      setTimeout(handleCheck, 100)
      setTimeout(handleCheck, 350)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    handleCheck()

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleCheck)
        vv.removeEventListener('scroll', handleCheck)
      }
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [threshold])

  return isKeyboardOpen
}

export default useKeyboardOpen
