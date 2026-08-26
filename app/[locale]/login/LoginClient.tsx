'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo area */}
        <div className={`text-center mb-10 ${isAr ? 'rtl' : ''}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/30 to-amber-800/20 border border-amber-500/30 shadow-[0_0_30px_rgba(201,147,53,0.2)] mb-5">
            <span className="text-3xl">🕌</span>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
            {t.title}
          </h1>
          <p className="text-stone-400 mt-2 text-sm">{t.subtitle}</p>
        </div>

        {/* Card */}
        <div className="glass p-8 shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label className="label">{t.email}</label>
              <input
                {...register('email')}
                type="email"
                className="input-field"
                dir="ltr"
                autoComplete="username"
                autoFocus
              />
              {errors.email && <p className="error-text">Valid email required</p>}
            </div>

            <div>
              <label className="label">{t.password}</label>
              <input
                {...register('password')}
                type="password"
                className="input-field"
                dir="ltr"
                autoComplete="current-password"
              />
              {errors.password && <p className="error-text">Password required</p>}
            </div>

            {serverErr && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                {serverErr}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2 py-3 text-base">
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
