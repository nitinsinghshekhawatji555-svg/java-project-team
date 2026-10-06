'use client'

import { useEffect, useState } from 'react'

export default function RotatingTips({ compact = false }) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  const tips = [
    {
      category: 'Road Safety',
      quote: 'Keep a safe distance of at least 2 seconds behind the vehicle ahead of you.',
    },
    {
      category: 'Highway Code',
      quote: 'Always check your mirrors and blind spots before changing lanes.',
    },
    {
      category: 'Vehicle Maintenance',
      quote: 'Check your tire pressure monthly and before long journeys.',
    },
    {
      category: 'Ghana Driving',
      quote: 'Be extra cautious on Ghanaian highways, watch for unexpected obstacles and pedestrians.',
    },
    {
      category: 'Emergency Preparedness',
      quote: 'Always carry a first aid kit, flashlight, and emergency contact numbers.',
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length)
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [tips.length])

  const displayTipIndex = currentTipIndex
  const tip = tips[displayTipIndex]

  if (compact) {
    // Mobile/compact version - small text at bottom
    return (
      <div className="flex flex-col items-center justify-center space-y-2 w-full">
        <div className="flex gap-1">
          {tips.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 w-1 rounded-full transition-all duration-300 ${
                idx === displayTipIndex ? 'w-4 bg-amber-600' : 'bg-amber-200'
              }`}
            />
          ))}
        </div>

        <div className="text-center space-y-1 max-w-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
            {tip.category}
          </p>
          <p className="text-xs font-bold leading-snug text-[#FDFBF7]">
            {tip.quote}
          </p>
        </div>
      </div>
    )
  }

  // Desktop/large version
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-8 lg:space-y-12 px-4 lg:px-0">
      <div className="flex gap-2 lg:gap-3">
        {tips.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 w-2 lg:h-3 lg:w-3 rounded-full transition-all duration-300 ${
              idx === displayTipIndex ? 'w-8 lg:w-10 bg-amber-700' : 'bg-amber-300'
            }`}
          />
        ))}
      </div>

      <div className="text-center space-y-3 lg:space-y-6 max-w-lg lg:max-w-2xl">
        <p className="text-sm lg:text-base xl:text-lg font-semibold text-[#F59E0B] uppercase tracking-widest">
          {tip.category}
        </p>
        <p className="text-2xl lg:text-4xl xl:text-5xl font-bold text-[#FDFBF7] leading-tight lg:leading-snug">
          {tip.quote}
        </p>
      </div>
    </div>
  )
}
