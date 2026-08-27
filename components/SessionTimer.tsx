'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ShieldAlert, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface SessionTimerProps {
  tokenExp: number // Unix timestamp in seconds
  locale: string
}

export default function SessionTimer({ tokenExp, locale }: SessionTimerProps) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [hasExpired, setHasExpired] = useState(false)

  useEffect(() => {
    if (!tokenExp) return

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = tokenExp - now

      if (diff <= 0) {
        setTimeLeft(0)
        if (!hasExpired) {
          setHasExpired(true)
          toast.error('Your session has expired. Redirecting to login...', { duration: 4000 })
          // Trigger logout API and redirect
          fetch('/api/logout', { method: 'POST' }).finally(() => {
            window.location.href = `/${locale}/login`
          })
        }
      } else {
        setTimeLeft(diff)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [tokenExp, hasExpired, locale, router])

  if (!tokenExp || timeLeft <= 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <ShieldAlert size={14} className="animate-spin" />
        <span>Session Expired</span>
      </div>
    )
  }

  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = timeLeft % 60

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const isCritical = timeLeft < 300 // under 5 mins
  const isWarning = timeLeft < 900 && !isCritical // under 15 mins

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
        isCritical
          ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse shadow-sm'
          : isWarning
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-gray-100/90 text-gray-700 border-gray-200'
      }`}
      title={isCritical ? 'Session expiring soon! Save your work.' : 'Active session remaining time'}
    >
      {isCritical ? (
        <AlertTriangle size={13} className="text-rose-600 animate-bounce shrink-0" />
      ) : (
        <Clock size={13} className={isWarning ? 'text-amber-600 shrink-0' : 'text-emerald-700 shrink-0'} />
      )}
      <span className="text-[11px] font-semibold text-gray-500 hidden md:inline">Session:</span>
      <span className="font-mono font-bold tracking-wider">{formattedTime}</span>
    </div>
  )
}
