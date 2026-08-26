import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { decodeAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Musabaqa Admin',
  description: 'Admin Dashboard for Musabaqa Quran Competition',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const isRtl = locale === 'ar'

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className="min-h-screen antialiased" style={{ background: '#07070f', color: '#f0f0ff' }}>

        {/* Noise texture overlay */}
        <div className="noise-overlay" />

        {/* Animated ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {/* Gold orb – top left */}
          <div
            className="animate-gradient-flow"
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-10%',
              width: '55vw',
              height: '55vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(240,192,96,0.08) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animationDelay: '0s',
            }}
          />
          {/* Emerald orb – center right */}
          <div
            className="animate-gradient-flow"
            style={{
              position: 'absolute',
              top: '30%',
              right: '-15%',
              width: '45vw',
              height: '45vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,216,138,0.06) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animationDelay: '3s',
            }}
          />
          {/* Purple orb – bottom center */}
          <div
            className="animate-gradient-flow"
            style={{
              position: 'absolute',
              bottom: '-10%',
              left: '25%',
              width: '50vw',
              height: '50vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)',
              filter: 'blur(80px)',
              animationDelay: '6s',
            }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>

        <Toaster richColors position={isRtl ? 'top-left' : 'top-right'} />
      </body>
    </html>
  )
}
