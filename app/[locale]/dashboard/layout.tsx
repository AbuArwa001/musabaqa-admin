import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { decodeAdminToken } from '@/lib/auth'
import DashboardLayoutClient from '@/components/DashboardLayoutClient'

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
    <DashboardLayoutClient
      locale={locale}
      dict={dict}
      role={claims.role}
      userName={claims.name}
      exp={claims.exp}
      isAr={isAr}
      otherLocale={otherLocale}
    >
      {children}
    </DashboardLayoutClient>
  )
}
