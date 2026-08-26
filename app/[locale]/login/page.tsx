import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { notFound } from 'next/navigation'
import LoginClient from './LoginClient'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')?.value
  if (token) redirect(`/${locale}/dashboard`)

  const dict = await getDictionary(locale)
  return <LoginClient dict={dict} locale={locale} />
}
