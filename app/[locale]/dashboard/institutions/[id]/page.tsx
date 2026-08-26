import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/dictionaries'
import { getInstitution, listStudents, listCategories, listRegions } from '@/lib/api'
import InstitutionDetailClient from './InstitutionDetailClient'

export const dynamic = 'force-dynamic'

export default async function InstitutionDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value

  const [inst, allStudents, categories, regions] = await Promise.all([
    getInstitution(token, Number(id)).catch(() => null),
    listStudents(token, { institution_id: id }).catch(() => []),
    listCategories().catch(() => []),
    listRegions().catch(() => []),
  ])

  if (!inst) notFound()

  return (
    <InstitutionDetailClient
      initialInstitution={inst}
      students={allStudents}
      categories={categories}
      regions={regions}
      locale={locale}
      token={token}
    />
  )
}
