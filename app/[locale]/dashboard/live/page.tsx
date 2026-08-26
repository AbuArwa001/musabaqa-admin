import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listStudents, listRounds } from '@/lib/api'
import LiveClient from './LiveClient'

export const dynamic = 'force-dynamic'

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const dict = await getDictionary(locale)

  const [students, rounds] = await Promise.all([
    listStudents(token).catch(() => []),
    listRounds(token).catch(() => []),
  ])

  return <LiveClient students={students} rounds={rounds} dict={dict} locale={locale} token={token} />
}
