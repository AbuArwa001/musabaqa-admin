import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/dictionaries'
import { getStudent, getInstitution, listCategories } from '@/lib/api'
import StudentDetailClient from './StudentDetailClient'

export const dynamic = 'force-dynamic'

export default async function StudentDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value

  const [student, categories] = await Promise.all([
    getStudent(token, Number(id)).catch(() => null),
    listCategories().catch(() => []),
  ])

  if (!student) notFound()

  const institution = await getInstitution(token, student.institution_id).catch(() => null)

  return (
    <StudentDetailClient
      initialStudent={student}
      institution={institution}
      categories={categories}
      locale={locale}
      token={token}
    />
  )
}
