import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { decodeAdminToken } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

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

  const dict = await getDictionary(locale)
  const isAr = locale === 'ar'

  return (
    <div className={`flex min-h-screen ${isAr ? 'flex-row-reverse' : ''}`}>
      <Sidebar locale={locale} dict={dict} role={claims.role} userName={claims.name} />
      <main className={`flex-1 ${isAr ? 'mr-60' : 'ml-60'} min-h-screen`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
