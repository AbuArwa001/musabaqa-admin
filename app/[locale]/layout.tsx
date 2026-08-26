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
      <body className="min-h-screen bg-[#0d0d0f] text-stone-100 antialiased">
        {/* Global ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-900/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[120px]" />
        </div>
        {children}
        <Toaster richColors position={isRtl ? 'top-left' : 'top-right'} />
      </body>
    </html>
  )
}
