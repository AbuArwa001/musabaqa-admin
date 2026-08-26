import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listInstitutions, listRegions } from '@/lib/api'
import InstitutionsClient from './InstitutionsClient'

export const dynamic = 'force-dynamic'

export default async function InstitutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const dict = await getDictionary(locale)

  const [institutions, regions] = await Promise.all([
    listInstitutions(token).catch(() => []),
    listRegions().catch(() => []),
  ])

  return <InstitutionsClient initialData={institutions} regions={regions} dict={dict} locale={locale} token={token} />
}
