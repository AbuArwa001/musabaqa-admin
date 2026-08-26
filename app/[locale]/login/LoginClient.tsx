'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react'
import type { Dict } from '@/lib/dictionaries'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
type Form = z.infer<typeof schema>

export default function LoginClient({ dict, locale }: { dict: Dict; locale: string }) {
  const t = dict.login
  const isAr = locale === 'ar'
  const router = useRouter()
  const [serverErr, setServerErr] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

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
        return
      }
      router.push(`/${locale}/dashboard`)
    } catch {
      setServerErr(t.error_invalid)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ direction: isAr ? 'rtl' : 'ltr' }}>

      {/* Floating geometric particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${[80,120,60,100,70,90][i]}px`,
              height: `${[80,120,60,100,70,90][i]}px`,
              left: `${[10,70,30,80,15,55][i]}%`,
              top:  `${[20,60,80,15,45,70][i]}%`,
              background: i % 2 === 0
                ? 'radial-gradient(circle, rgba(240,192,96,0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(0,216,138,0.06) 0%, transparent 70%)',
              filter: 'blur(20px)',
              animation: `float ${6 + i * 1.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative" style={{ zIndex: 2 }}>

        {/* Logo / Hero area */}
        <div className="text-center mb-8 animate-fade-slide-up">
          {/* Icon */}
          <div className="relative inline-block mb-6">
            <div
              className="relative w-24 h-24 flex items-center justify-center mx-auto"
            >
              <Image src="/logo.png" alt="Musabaqa Logo" width={96} height={96} className="object-contain" priority />
            </div>
          </div>

          <h1
            className="text-4xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #f0c060 0%, #fde68a 50%, #e8a83a 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            {t.title}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(160,160,192,0.7)' }}>
            {t.subtitle}
          </p>
        </div>

        {/* Login Card */}
        <div
          className="shimmer-card p-8 animate-fade-slide-up"
          style={{ animationDelay: '0.1s', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}
        >
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email field */}
            <div>
              <label className="label">{t.email}</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: '14px', color: 'rgba(160,160,192,0.5)', pointerEvents: 'none' }}
                />
                <input
                  {...register('email')}
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  dir="ltr"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.email && <p className="error-text">Valid email required</p>}
            </div>

            {/* Password field */}
            <div>
              <label className="label">{t.password}</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: '14px', color: 'rgba(160,160,192,0.5)', pointerEvents: 'none' }}
                />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ right: '10px', color: 'rgba(160,160,192,0.5)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="error-text">Password required</p>}
            </div>

            {/* Server error */}
            {serverErr && (
              <div
                className="rounded-xl p-4 flex items-start gap-3 text-sm"
                style={{
                  background: 'rgba(245,107,126,0.08)',
                  border: '1px solid rgba(245,107,126,0.25)',
                  color: '#f56b7e',
                }}
              >
                <span className="text-base leading-none mt-0.5">⚠</span>
                <span>{serverErr}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold w-full mt-2 py-3.5 text-base"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> {t.submitting}</>
              ) : t.submit}
            </button>
          </form>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-xs mt-6 animate-fade-slide-up" style={{ color: 'rgba(160,160,192,0.4)', animationDelay: '0.2s' }}>
          Secured admin portal · Musabaqa Competition System
        </p>
      </div>
    </div>
  )
}
