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
    const round = await getRound(token, roundId)
    // Only fetch students for this specific round's category
    const students = await listStudents(token, { category_id: round.category_id.toString() })
    const results = await getRoundResults(token, roundId)
    
    return (
      <ScoringClient 
        round={round}
        students={students}
        results={results}
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
