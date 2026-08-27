import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { decodeAdminToken } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import SessionTimer from '@/components/SessionTimer'
import Link from 'next/link'
import { Languages } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')?.value
  if (!token) redirect(`/${locale}/login`)

  const claims = decodeAdminToken(token)
  if (!claims) redirect(`/${locale}/login`)

  // Check if already expired on server load
  const now = Math.floor(Date.now() / 1000)
  if (claims.exp && claims.exp <= now) {
    redirect(`/${locale}/login`)
  }

  const dict = await getDictionary(locale)
  const isAr = locale === 'ar'
  const otherLocale = isAr ? 'en' : 'ar'

  return (
    <div className={`flex h-screen bg-gray-50 overflow-hidden font-sans ${isAr ? 'flex-row-reverse' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Sidebar with Jamia Mosque Theme */}
      <Sidebar locale={locale} dict={dict} role={claims.role} userName={claims.name} />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        {/* Top Header Navbar matching jamia-admin */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sm:px-8 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-serif text-base sm:text-lg font-bold text-gray-900 truncate">
              Jamia Mosque Musabaqa CMS
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Token Expiration Countdown Timer */}
            {claims.exp && (
              <SessionTimer tokenExp={claims.exp} locale={locale} />
            )}

            {/* Language Switcher */}
            <Link
              href={`/${otherLocale}/dashboard`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </Link>

            <div className="text-xs text-gray-500 font-medium hidden md:block">
              Connected to API (<code className="text-emerald-700 font-mono font-bold">musabaqa-api</code>)
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
