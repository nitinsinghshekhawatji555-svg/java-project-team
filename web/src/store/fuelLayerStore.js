import { create } from 'zustand'

const STORAGE_KEY = 'show_fuel_stations'

export const useFuelLayerStore = create((set, get) => ({
  showFuel: false,
  isHydrated: false,

  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      set({ showFuel: stored === 'true', isHydrated: true })
    } else {
      set({ isHydrated: true })
    }
  },

  setShowFuel: (value) => {
    const nextVal = typeof value === 'function' ? value(get().showFuel) : value
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, nextVal ? 'true' : 'false')
    }
    set({ showFuel: nextVal })
  },

  toggleFuel: (forcedVal) => {
    const current = get().showFuel
    const nextVal = typeof forcedVal === 'boolean' ? forcedVal : !current
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, nextVal ? 'true' : 'false')
    }
    set({ showFuel: nextVal })
  },
}))
