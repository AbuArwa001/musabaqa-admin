'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Clock, ShieldAlert, AlertTriangle, RefreshCw, LogOut, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

interface SessionTimerProps {
  tokenExp: number // Unix timestamp in seconds
  locale: string
}

export default function SessionTimer({ tokenExp: initialTokenExp, locale }: SessionTimerProps) {
  const router = useRouter()
  const isAr = locale === 'ar'

  const [tokenExp, setTokenExp] = useState<number>(initialTokenExp)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [hasExpired, setHasExpired] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sync state if initialTokenExp changes
  useEffect(() => {
    setTokenExp(initialTokenExp)
  }, [initialTokenExp])

  useEffect(() => {
    if (!tokenExp) return

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = tokenExp - now

      if (diff <= 0) {
        setTimeLeft(0)
        if (!hasExpired) {
          setHasExpired(true)
          setShowWarningModal(false)
          toast.error(isAr ? 'انتهت جلستك. جارٍ إعادة التوجيه...' : 'Your session has expired. Redirecting to login...', { duration: 4000 })
          fetch('/api/logout', { method: 'POST' }).finally(() => {
            window.location.href = `/${locale}/login?reason=expired`
          })
        }
      } else {
        setTimeLeft(diff)
        // Show ultra-premium modal when remaining session is less than 60 seconds
        if (diff <= 60 && !hasExpired) {
          setShowWarningModal(true)
        } else if (diff > 60) {
          setShowWarningModal(false)
        }
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [tokenExp, hasExpired, locale, router, isAr])

  const handleExtendSession = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Session refresh failed')
      }

      if (data.exp) {
        setTokenExp(data.exp)
      } else {
        // Fallback: 12 hours from now
        setTokenExp(Math.floor(Date.now() / 1000) + 60 * 60 * 12)
      }

      setShowWarningModal(false)
      toast.success(
        isAr ? 'تم تمديد الجلسة بنجاح!' : 'Session successfully extended by 12 hours!',
        { icon: '✨' }
      )
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || (isAr ? 'فشل تمديد الجلسة' : 'Failed to extend session'))
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogoutNow = async () => {
    setShowWarningModal(false)
    toast.info(isAr ? 'جارٍ تسجيل الخروج...' : 'Signing out...')
    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      window.location.href = `/${locale}/login`
    }
  }

  if (!tokenExp || timeLeft <= 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <ShieldAlert size={14} className="animate-spin" />
        <span>{isAr ? 'انتهت الجلسة' : 'Session Expired'}</span>
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
  const isUnderOneMin = timeLeft <= 60

  return (
    <>
      {/* ─── 1. Header Toolbar Session Badge ─── */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
          isUnderOneMin
            ? 'bg-rose-100 text-rose-900 border-rose-400 animate-pulse shadow-md ring-2 ring-rose-500/40'
            : isCritical
            ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse shadow-sm'
            : isWarning
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-gray-100/90 text-gray-700 border-gray-200'
        }`}
        title={isUnderOneMin ? 'Session expiring in less than 1 minute!' : isCritical ? 'Session expiring soon! Save your work.' : 'Active session remaining time'}
      >
        {isCritical ? (
          <AlertTriangle size={13} className="text-rose-600 animate-bounce shrink-0" />
        ) : (
          <Clock size={13} className={isWarning ? 'text-amber-600 shrink-0' : 'text-emerald-700 shrink-0'} />
        )}
        <span className="text-[11px] font-semibold text-gray-500 hidden md:inline">
          {isAr ? 'الجلسة:' : 'Session:'}
        </span>
        <span className="font-mono font-bold tracking-wider">{formattedTime}</span>
      </div>

      {/* ─── 2. Ultra-Premium Session Expiry Warning Modal (< 1 minute) ─── */}
      {showWarningModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-[#121820] border-2 border-amber-500/40 rounded-3xl p-7 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Background Ambient Glow & Watermark */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            
            {/* Top Emblem & Warning Halo */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-pulse">
                  <ShieldAlert size={38} className="text-amber-400" />
                </div>
                <div className="absolute inset-0 rounded-full border border-amber-300/30 animate-ping" />
              </div>

              {/* Branding Header */}
              <p className="text-[#F0D97A] text-[10px] uppercase font-bold tracking-widest font-mono mb-1">
                JAMIA MOSQUE COMMITTEE · ADMINISTRATIVE PORTAL
              </p>
              <h2 className="text-2xl font-bold font-serif text-white tracking-tight">
                {isAr ? 'جلسة العمل على وشك الانتهاء' : 'Session Expiring Soon'}
              </h2>
              <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed">
                {isAr
                  ? 'لحماية أمان النظام وبياناتك، ستنتهي جلستك الإدارية قريباً ما لم تختر المتابعة.'
                  : 'For your security, your administrative session will expire in less than a minute.'}
              </p>

              {/* Big Digital Countdown Clock */}
              <div className="my-6 p-4 rounded-2xl bg-black/60 border border-amber-500/25 w-full flex flex-col items-center shadow-inner">
                <span className="text-[10px] uppercase font-bold text-amber-300/80 tracking-widest mb-1">
                  {isAr ? 'الوقت المتبقي' : 'TIME REMAINING'}
                </span>
                <span className="text-5xl font-black font-mono tracking-widest text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                  00:{String(seconds).padStart(2, '0')}
                </span>

                {/* Draining Linear Progress Bar */}
                <div className="w-full bg-gray-800/80 h-2 rounded-full mt-4 overflow-hidden border border-gray-700/50">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                      seconds < 20 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (seconds / 60) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={handleExtendSession}
                  disabled={isRefreshing}
                  className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#006838] to-[#004d29] hover:from-[#007a42] hover:to-[#005c31] border border-emerald-400/40 text-white font-bold text-sm shadow-[0_4px_20px_rgba(0,104,56,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-50"
                >
                  <RefreshCw size={16} className={`text-emerald-200 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  <span>{isRefreshing ? (isAr ? 'جارٍ التمديد...' : 'Extending...') : (isAr ? 'تمديد ومتابعة الجلسة' : 'Stay Logged In')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutNow}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <LogOut size={15} />
                  <span>{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 mt-4">
                {isAr
                  ? 'سيتم تسجيل خروجك تلقائياً عند انتهاء العداد للحفاظ على أمان البيانات.'
                  : 'You will be safely logged out automatically when the counter reaches 00:00.'}
              </p>
            </div>

          </div>
        </div>
      , document.body)}
    </>
  )
}

