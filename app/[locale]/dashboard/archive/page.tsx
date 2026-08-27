import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listStudents, listInstitutions, listCategories, listRegions } from '@/lib/api'
import ArchiveClient from './ArchiveClient'

export const dynamic = 'force-dynamic'

export default async function ArchivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const dict = await getDictionary(locale)

  const [allStudents, institutions, categories, regions] = await Promise.all([
    listStudents(token).catch(() => []),
    listInstitutions(token).catch(() => []),
    listCategories().catch(() => []),
    listRegions().catch(() => []),
  ])

  const archivedStudents = allStudents.filter(s => s.is_deleted || s.review_status === 'REJECTED')

  return (
    <ArchiveClient
      initialData={archivedStudents}
      institutions={institutions}
      categories={categories}
      regions={regions}
      dict={dict}
      locale={locale}
      token={token}
    />
  )
}
