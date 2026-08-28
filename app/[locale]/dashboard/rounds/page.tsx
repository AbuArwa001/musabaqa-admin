import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { decodeAdminToken } from '@/lib/auth'
import { listRounds, listCategories, listAdminUsers } from '@/lib/api'
import RoundsClient from './RoundsClient'

export const dynamic = 'force-dynamic'

export default async function RoundsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const dict = await getDictionary(locale)
  const claims = decodeAdminToken(token)
  const role = claims?.role || 'JUDGE'

  const [rounds, categories, users] = await Promise.all([
    listRounds(token).catch(() => []),
    listCategories().catch(() => []),
    listAdminUsers(token).catch(() => []),
  ])

  // Filter users to only Judges and Moderators for panel assignment
  const eligibleJudges = users.filter(u => u.role === 'JUDGE' || u.role === 'MODERATOR')

  return <RoundsClient initialData={rounds} categories={categories} judges={eligibleJudges} dict={dict} locale={locale} token={token} role={role} />
}
