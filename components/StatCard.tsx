'use client'

import { useEffect, useRef } from 'react'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: 'gold' | 'emerald' | 'sapphire' | 'rose' | 'purple'
  animDelay?: number
}

const colorMap = {
  gold: {
    accent:   'linear-gradient(90deg, #f0c060, #e8a83a)',
    iconBg:   'rgba(240,192,96,0.12)',
    iconColor: '#f0c060',
    glow:     '0 0 40px rgba(240,192,96,0.15)',
    border:   'rgba(240,192,96,0.2)',
    halo:     'rgba(240,192,96,0.25)',
    text:     '#f0c060',
  },
  emerald: {
    accent:   'linear-gradient(90deg, #00d88a, #00b371)',
    iconBg:   'rgba(0,216,138,0.12)',
    iconColor: '#00d88a',
    glow:     '0 0 40px rgba(0,216,138,0.15)',
    border:   'rgba(0,216,138,0.2)',
    halo:     'rgba(0,216,138,0.25)',
    text:     '#00d88a',
  },
  sapphire: {
    accent:   'linear-gradient(90deg, #5b8df5, #3b5fd8)',
    iconBg:   'rgba(91,141,245,0.12)',
    iconColor: '#5b8df5',
    glow:     '0 0 40px rgba(91,141,245,0.15)',
    border:   'rgba(91,141,245,0.2)',
    halo:     'rgba(91,141,245,0.25)',
    text:     '#5b8df5',
  },
  rose: {
    accent:   'linear-gradient(90deg, #f56b7e, #dc2626)',
    iconBg:   'rgba(245,107,126,0.12)',
    iconColor: '#f56b7e',
    glow:     '0 0 40px rgba(245,107,126,0.15)',
    border:   'rgba(245,107,126,0.2)',
    halo:     'rgba(245,107,126,0.25)',
    text:     '#f56b7e',
  },
  purple: {
    accent:   'linear-gradient(90deg, #a78bfa, #7c3aed)',
    iconBg:   'rgba(167,139,250,0.12)',
    iconColor: '#a78bfa',
    glow:     '0 0 40px rgba(167,139,250,0.15)',
    border:   'rgba(167,139,250,0.2)',
    halo:     'rgba(167,139,250,0.25)',
    text:     '#a78bfa',
  },
}

export default function StatCard({ label, value, icon, color, animDelay = 0 }: StatCardProps) {
  const c = colorMap[color]
  const numberRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = numberRef.current
    if (!el) return
    const target = value
    const duration = 900
    const start = Date.now() + animDelay
    let frame: number

    const tick = () => {
      const now = Date.now()
      if (now < start) { frame = requestAnimationFrame(tick); return }
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out-cubic
      el.textContent = Math.round(eased * target).toString()
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, animDelay])

  return (
    <div
      className="kpi-card group"
      style={{ boxShadow: c.glow, borderColor: c.border }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full"
        style={{ background: c.accent, opacity: 0.8 }}
      />

      {/* Icon with halo */}
      <div className="relative w-12 h-12">
        {/* Outer halo ring */}
        <div
          className="absolute inset-0 rounded-2xl animate-[pulse_3s_ease-in-out_infinite]"
          style={{ background: c.halo, filter: 'blur(8px)', transform: 'scale(1.3)' }}
        />
        <div
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: c.iconBg, color: c.iconColor, border: `1px solid ${c.border}` }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="mt-3">
        <div
          className="text-5xl font-bold tracking-tight animate-count-up"
          style={{ color: c.text, animationDelay: `${animDelay}ms`, fontFamily: 'var(--font-display)' }}
        >
          <span ref={numberRef}>0</span>
        </div>
        <p className="text-sm font-medium mt-1.5" style={{ color: 'rgba(160,160,192,0.8)', fontFamily: 'var(--font-display)' }}>
          {label}
        </p>
      </div>

      {/* Bottom-right decorative glow */}
      <div
        className="absolute bottom-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: c.iconBg, filter: 'blur(20px)', transform: 'translate(30%, 30%)' }}
      />
    </div>
  )
}
