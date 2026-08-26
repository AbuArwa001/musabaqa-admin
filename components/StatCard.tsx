'use client'

import { useEffect, useRef } from 'react'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: 'gold' | 'emerald' | 'sapphire' | 'rose' | 'purple'
  desc?: string
  animDelay?: number
}

const colorMap = {
  gold: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    number: 'text-amber-900',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    number: 'text-emerald-950',
  },
  sapphire: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    number: 'text-sky-950',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    number: 'text-rose-950',
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    number: 'text-purple-950',
  },
}

export default function StatCard({ label, value, icon, color, desc, animDelay = 0 }: StatCardProps) {
  const c = colorMap[color] || colorMap.gold
  const numberRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = numberRef.current
    if (!el) return
    const target = value
    const duration = 800
    const start = Date.now() + animDelay
    let frame: number

    const tick = () => {
      const now = Date.now()
      if (now < start) { frame = requestAnimationFrame(tick); return }
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = Math.round(eased * target).toString()
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, animDelay])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
          {label}
        </span>
        <div className={`p-2 rounded-lg border ${c.badge} shrink-0`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className={`text-3xl font-bold font-serif ${c.number}`}>
          <span ref={numberRef}>0</span>
        </div>
        {desc && <p className="text-xs text-gray-500 mt-1 truncate">{desc}</p>}
      </div>
    </div>
  )
}
