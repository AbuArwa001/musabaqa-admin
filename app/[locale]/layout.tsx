import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Toaster } from 'sonner'
import { isValidLocale } from '@/lib/dictionaries'
import { Cinzel, Outfit, Noto_Sans_Arabic } from 'next/font/google'
import '../globals.css'

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  display: 'swap',
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
})

const notoArabic = Noto_Sans_Arabic({
  variable: '--font-arabic',
  subsets: ['arabic'],
  display: 'swap',
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Musabaqa Admin - Jamia Mosque Nairobi',
  description: 'Administrative Management Portal for Musabaqa Quran Competition - Jamia Mosque Nairobi',
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
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`${cinzel.variable} ${outfit.variable} ${notoArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-gray-50 text-gray-900" suppressHydrationWarning>
        {children}
        <Toaster richColors position={isRtl ? 'top-left' : 'top-right'} />
      </body>
    </html>
  )
}
