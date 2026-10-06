'use client'

import { useEffect } from 'react'
import { useFuelLayerStore } from '@/store/fuelLayerStore'

/**
 * useFuelLayer
 * Unified single source of truth for the fuel/EV station layer toggle state.
 * Returns [showFuel, toggleFuel, setShowFuel, isHydrated]
 */
export function useFuelLayer() {
  const showFuel = useFuelLayerStore((state) => state.showFuel)
  const toggleFuel = useFuelLayerStore((state) => state.toggleFuel)
  const setShowFuel = useFuelLayerStore((state) => state.setShowFuel)
  const isHydrated = useFuelLayerStore((state) => state.isHydrated)
  const hydrate = useFuelLayerStore((state) => state.hydrateFromStorage)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return [showFuel, toggleFuel, setShowFuel, isHydrated]
}

export default useFuelLayer
