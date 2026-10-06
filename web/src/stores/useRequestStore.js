import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SERVICE_TYPE } from '@/lib/constants'

const initialFormState = {
  currentStep: 1,
  incidentLat: null,
  incidentLng: null,
  incidentAddress: '',
  serviceType: SERVICE_TYPE.REPAIR,
  problemDescription: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  vehicleColor: '',
  vehiclePlate: '',
  preferredMechanicId: null,
  aiDiagnosticResult: null,
}

export const useRequestStore = create(
  persist(
    (set) => ({
      ...initialFormState,

      setStep: (step) => set({ currentStep: step }),
      
      updateField: (field, value) => set({ [field]: value }),

      updateFields: (fields) => set((state) => ({ ...state, ...fields })),

      setDiagnosticResult: (result) => set({ aiDiagnosticResult: result }),

      resetForm: () => {
        set({ ...initialFormState })
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem('roadrescue_request_form_cache')
          } catch (e) {
            console.warn('Failed to clear sessionStorage cache:', e)
          }
        }
      },
    }),
    {
      name: 'roadrescue_request_form_cache',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
