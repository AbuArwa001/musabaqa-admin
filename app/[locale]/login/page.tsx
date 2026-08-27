import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { decodeAdminToken } from '@/lib/auth'
import LoginClient from './LoginClient'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')?.value

  if (token) {
    const claims = decodeAdminToken(token)
    const now = Math.floor(Date.now() / 1000)
    // Only redirect to dashboard if token is valid and not expired!
    if (claims && (!claims.exp || claims.exp > now)) {
      redirect(`/${locale}/dashboard`)
    }
  }

  const dict = await getDictionary(locale)
  return <LoginClient dict={dict} locale={locale} />
}
