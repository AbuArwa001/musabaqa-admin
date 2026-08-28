'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  Crown, 
  Award, 
  Building2, 
  ArrowRight,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import type { Dict } from '@/lib/dictionaries'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type Form = z.infer<typeof schema>

export default function LoginClient({ dict, locale }: { dict: Dict; locale: string }) {
  const t = dict.login
  const isAr = locale === 'ar'
  const router = useRouter()
  const [serverErr, setServerErr] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [activeRoleTab, setActiveRoleTab] = useState<string>('SUPERADMIN')

  const { 
    register, 
    handleSubmit, 
    setValue, 
    formState: { errors, isSubmitting } 
  } = useForm<Form>({ 
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@jmc.or.ke',
      password: 'Admin@2025!',
    }
  })

  const handleQuickFill = (role: string, email: string, pass: string) => {
    setActiveRoleTab(role)
    setValue('email', email, { shouldValidate: true })
    setValue('password', pass, { shouldValidate: true })
    toast.info(`Populated credentials for ${role}`)
  }

  async function onSubmit(data: Form) {
    setServerErr('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        setServerErr(body.error || t.error_invalid)
        toast.error(body.error || t.error_invalid)
        return
      }
      toast.success('Authentication successful! Redirecting to dashboard...')
      router.push(`/${locale}/dashboard`)
    } catch {
      setServerErr(t.error_invalid)
      toast.error(t.error_invalid)
    }
  }

  return (
    <div 
      className={`h-screen w-screen overflow-hidden flex flex-col lg:flex-row bg-[#120e0c] font-sans select-none ${
        isAr ? 'lg:flex-row-reverse' : ''
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ─── SIDE 1: BRAND SHOWCASE & ANIMATED LOGO ───────────────────────────── */}
      <div className="relative flex-1 flex flex-col justify-between p-8 lg:p-14 bg-gradient-to-br from-[#1a1512] via-[#120e0c] to-[#004d29] text-white overflow-hidden border-b lg:border-b-0 lg:border-r border-[#2d2520]">
        
        {/* Background Ambient Glow Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#c99335]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(#c99335_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

        {/* Top Header Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-[#c99335]/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#c99335] animate-pulse" />
            <span className="font-serif text-xs font-bold text-[#c99335] uppercase tracking-wider">
              Jamia Mosque Committee
            </span>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">Musabaqa CMS v2.5</span>
        </div>

        {/* Center: Hero Emblem with Animated Loading Circle */}
        <div className="relative z-10 my-auto py-8 text-center space-y-6 flex flex-col items-center">
          
          {/* LOGO CONTAINER WITH ROTATING CIRCLE ANIMATION */}
          <div className="relative flex items-center justify-center">
            
            {/* Pulsing Outer Glow Ring when loading */}
            {isSubmitting && (
              <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-[#c99335]/40 via-emerald-500/30 to-[#c99335]/40 blur-xl animate-pulse" />
            )}

            {/* Circular Loading Animation Tracks */}
            {isSubmitting ? (
              <div className="absolute -inset-4 flex items-center justify-center pointer-events-none">
                {/* Outer Spinning Dash Ring */}
                <svg className="w-36 h-36 animate-spin text-[#c99335]" viewBox="0 0 100 100" fill="none">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeDasharray="60 40 20 50"
                    strokeLinecap="round"
                    className="opacity-90"
                  />
                </svg>
                {/* Inner Counter-Rotating Emerald Ring */}
                <svg className="absolute w-32 h-32 animate-reverse-spin-slow text-emerald-400" viewBox="0 0 100 100" fill="none">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="30 70 40 20"
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>
              </div>
            ) : (
              /* Static Golden Ambient Ring when idle */
              <div className="absolute -inset-2 rounded-full border border-[#c99335]/30 shadow-[0_0_25px_rgba(201,147,53,0.15)] pointer-events-none" />
            )}

            {/* Logo Emblem Box */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#1a1512] to-[#0a0807] border border-[#c99335]/50 flex items-center justify-center shadow-2xl p-3">
              <Image
                src="/logo.png"
                alt="Jamia Mosque Logo"
                width={100}
                height={100}
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
          </div>

          {/* Loading Indicator Status Pill */}
          {isSubmitting ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium animate-pulse shadow-lg shadow-emerald-950/60">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c99335]" />
              <span>Authenticating Session with Jamia Server...</span>
            </div>
          ) : (
            <div className="space-y-2 max-w-md">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Jamia Mosque <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c99335] via-amber-300 to-[#e39e3b]">Nairobi</span>
              </h1>
              <p className="font-serif text-base sm:text-lg text-emerald-400 font-semibold">
                Musabaqa Quran Competition Portal
              </p>
              <p className="text-xs sm:text-sm text-stone-300/80 leading-relaxed pt-1">
                Centralized platform for contestant registration, real-time live scoring, panel judge assignments, and official results tabulation.
              </p>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="hidden lg:grid grid-cols-2 gap-3 pt-4 text-left max-w-lg w-full">
            <div className="p-3 rounded-xl bg-stone-900/60 border border-white/5 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white font-serif">Live Judging System</p>
                <p className="text-[11px] text-stone-400">Real-time Tajweed & Hifdh scoring</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-900/60 border border-white/5 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#c99335] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white font-serif">Roster Verification</p>
                <p className="text-[11px] text-stone-400">Madrasa & candidate management</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Security Badge */}
        <div className="relative z-10 flex items-center justify-between text-xs text-stone-400 pt-4 border-t border-white/10">
          <span className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            TLS 256-Bit SSL Encrypted
          </span>
          <span className="text-stone-400 font-mono text-[11px]">
            &copy; {new Date().getFullYear()} Jamia Mosque Committee
          </span>
        </div>

      </div>

      {/* ─── SIDE 2: AUTHENTICATION FORM ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-[#1a1512] overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authorized Staff Sign In</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Sign In to Management
            </h2>
            <p className="text-xs text-stone-400">
              Enter your assigned staff account credentials to access management console.
            </p>
          </div>

          {/* Quick 1-Click Role Fill */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#c99335]" /> Quick Demo Accounts:
              </span>
              <span className="text-[10px] text-stone-500 font-mono">1-Click Auto Fill</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('SUPERADMIN', 'admin@jmc.or.ke', 'Admin@2025!')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  activeRoleTab === 'SUPERADMIN'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/40'
                    : 'bg-stone-950/50 border-white/5 text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
                }`}
              >
                <Crown className="w-4 h-4 mb-1 text-amber-400" />
                <span className="font-bold text-[11px]">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('JUDGE', 'judge1@jmc.or.ke', 'Judge@2025!')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  activeRoleTab === 'JUDGE'
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 shadow-md shadow-sky-950/40'
                    : 'bg-stone-950/50 border-white/5 text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
                }`}
              >
                <Award className="w-4 h-4 mb-1 text-sky-400" />
                <span className="font-bold text-[11px]">Judge 1</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('INSTITUTION', 'nuuralislam@example.com', 'Inst@2025!')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  activeRoleTab === 'INSTITUTION'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/40'
                    : 'bg-stone-950/50 border-white/5 text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
                }`}
              >
                <Building2 className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="font-bold text-[11px]">Madrasa</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 block">
                {t.email}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@jmc.or.ke"
                  className="w-full pl-10 pr-4 h-11 bg-stone-950/70 border border-stone-800 text-white font-medium placeholder:text-stone-500 focus:border-[#c99335] focus:ring-1 focus:ring-[#c99335] rounded-xl text-sm transition-all outline-none"
                  dir="ltr"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-400 font-medium pl-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 block">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 h-11 bg-stone-950/70 border border-stone-800 text-white font-medium placeholder:text-stone-500 focus:border-[#c99335] focus:ring-1 focus:ring-[#c99335] rounded-xl text-sm transition-all outline-none font-mono"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400 font-medium pl-1">{errors.password.message}</p>
              )}
            </div>

            {/* Server Error */}
            {serverErr && (
              <div className="rounded-xl p-3.5 flex items-start gap-2.5 text-xs bg-rose-950/40 border border-rose-900/60 text-rose-300">
                <span className="text-base leading-none">⚠️</span>
                <span>{serverErr}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 mt-2 bg-gradient-to-r from-[#006838] via-emerald-600 to-[#004d29] hover:from-[#007c43] hover:to-[#005e32] text-white rounded-xl font-serif font-bold text-sm shadow-xl shadow-emerald-950/80 hover:shadow-emerald-900/60 disabled:opacity-60 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-300" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Support Link */}
          <div className="pt-2 text-center">
            <p className="text-xs text-stone-500">
              Assigned to Jamia Mosque Committee · Official Portal
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
