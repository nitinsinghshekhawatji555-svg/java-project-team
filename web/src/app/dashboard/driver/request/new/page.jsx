'use client'

import Link from 'next/link'
import RequestForm from '@/components/request/RequestForm'

export default function NewRequestPage() {
  return (
    <div className="w-full min-h-fit bg-transparent text-[#1F1B10] flex justify-center items-start pt-3 pb-24 md:pt-6 md:pb-8">
      <div className="w-full max-w-2xl flex flex-col gap-5">
        
        <div className="rounded-2xl bg-[#1F1B10] px-5 py-5 text-white shadow-md relative overflow-hidden border border-white/10">
         
          <h1 className="mt-1 text-xl font-black tracking-tight text-white">Start a rescue request</h1>
          <p className="mt-1.5 text-xs text-white/70 leading-relaxed">
            Submit your location coordinates, vehicle details, and breakdown symptoms for live matching and roadside dispatch.
          </p>
        </div>

        <RequestForm />
        
      </div>
    </div>
  )
}