import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listAuditLogs } from '@/lib/api'
import { decodeAdminToken } from '@/lib/auth'
import AuditClient from './AuditClient'

export const dynamic = 'force-dynamic'

export default async function AuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const claims = decodeAdminToken(token)
  
  if (!claims || claims.role !== 'SUPERADMIN') {
    redirect(`/${locale}/dashboard`)
  }

  const dict = await getDictionary(locale)
  const logs = await listAuditLogs(token).catch(() => [])

  return <AuditClient initialData={logs} dict={dict} locale={locale} />
}
