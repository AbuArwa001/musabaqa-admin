import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listStudents } from '@/lib/api'
import { decodeAdminToken } from '@/lib/auth'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const claims = decodeAdminToken(token)
  
  if (!claims || (claims.role !== 'SUPERADMIN' && claims.role !== 'MODERATOR')) {
    redirect(`/${locale}/dashboard`)
  }

  const dict = await getDictionary(locale)

  const students = await listStudents(token).catch(() => [])
  // Only students that reached finals or are approved makes sense for dossiers
  const eligibleForDossier = students.filter(s => s.review_status === 'APPROVED' && !s.is_deleted)

  return <ReportsClient students={eligibleForDossier} dict={dict} locale={locale} token={token} />
}
