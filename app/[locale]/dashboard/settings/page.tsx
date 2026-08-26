import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listRegions, listCategories, listAdminUsers } from '@/lib/api'
import { decodeAdminToken } from '@/lib/auth'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const claims = decodeAdminToken(token)
  
  // Settings is SUPERADMIN only
  if (!claims || claims.role !== 'SUPERADMIN') {
    redirect(`/${locale}/dashboard`)
  }

  const dict = await getDictionary(locale)

  const [regions, categories, users] = await Promise.all([
    listRegions().catch(() => []),
    listCategories().catch(() => []),
    listAdminUsers(token).catch(() => []),
  ])

  return <SettingsClient regions={regions} categories={categories} users={users} dict={dict} locale={locale} token={token} />
}
