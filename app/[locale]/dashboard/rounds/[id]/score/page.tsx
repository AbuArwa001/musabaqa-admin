import { notFound } from 'next/navigation'
import { getDictionary, isValidLocale } from '@/lib/dictionaries'
import { getRound, listStudents, getRoundResults } from '@/lib/api'
import { cookies } from 'next/headers'
import { decodeAdminToken } from '@/lib/auth'
import ScoringClient from './ScoringClient'

export const dynamic = 'force-dynamic'

export default async function ScorePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')?.value
  if (!token) notFound()

  const claims = decodeAdminToken(token)
  if (!claims) notFound()

  const dict = await getDictionary(locale)
  const roundId = parseInt(id)

  try {
    const [round, allStudents, results, deductionRes, categories, institutions] = await Promise.all([
      getRound(token, roundId),
      listStudents(token),
      getRoundResults(token, roundId),
      import('@/lib/api').then(m => m.getRoundDeductionTypes(token, roundId)),
      import('@/lib/api').then(m => m.listCategories().catch(() => [])),
      import('@/lib/api').then(m => m.listInstitutions(token).catch(() => [])),
    ])

    const cat = categories.find(c => c.id === round.category_id)
    if (cat) {
      round.category_name_en = cat.name_en
      round.category_name_ar = cat.name_ar
    }

    const instMap = new Map(institutions.map(i => [i.id, i.name]))

    // Filter students for this specific round's category
    const students = allStudents
      .filter(s => s.category_id === round.category_id && s.review_status === 'APPROVED')
      .map(s => ({
        ...s,
        institution_name: instMap.get(s.institution_id) || 'مركز الأنوار'
      }))

    return (
      <ScoringClient 
        round={round}
        students={students}
        results={results}
        deductionTypes={deductionRes.deduction_types}
        initialRubricMode={deductionRes.rubric_mode || 'OFFICIAL_70_30'}
        dict={dict}
        locale={locale}
        token={token}
        currentUserId={claims.sub ? parseInt(claims.sub) : 0}
        role={claims.role}
      />
    )
  } catch (error) {
    console.error("Failed to load scoring page data:", error)
    return (
      <div className="p-8 text-center text-red-500">
        <p>Failed to load round data. Ensure the API is running and you have proper permissions.</p>
      </div>
    )
  }
}
