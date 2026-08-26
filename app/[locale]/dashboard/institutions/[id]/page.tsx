import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { getInstitution, listStudents, listCategories } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function InstitutionDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const dict = await getDictionary(locale)
  const isAr = locale === 'ar'

  const [inst, allStudents, categories] = await Promise.all([
    getInstitution(token, Number(id)).catch(() => null),
    listStudents(token, { institution_id: id }).catch(() => []),
    listCategories().catch(() => []),
  ])
  if (!inst) notFound()

  const catMap = Object.fromEntries(categories.map(c => [c.id, isAr ? c.name_ar : c.name_en]))

  return (
    <div>
      <Link href={`/${locale}/dashboard/institutions`} className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors mb-8 text-sm">
        <ArrowLeft size={16} /> Back to Institutions
      </Link>

      <div className="glass p-8 mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{inst.name}</h1>
            <p className="text-stone-400 mt-1">{inst.type} · {inst.email}</p>
            <p className="text-stone-500 text-sm">{inst.phone}</p>
          </div>
          <span className={inst.status === 'APPROVED' ? 'badge-approved text-base px-4 py-1' : inst.status === 'REJECTED' ? 'badge-rejected text-base px-4 py-1' : 'badge-pending text-base px-4 py-1'}>
            {inst.status}
          </span>
        </div>
        {inst.rejection_reason && (
          <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            Rejection reason: {inst.rejection_reason}
          </div>
        )}
      </div>

      <div className="glass overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">{dict.institutions.detail_students}</h2>
        </div>
        {allStudents.length === 0
          ? <p className="p-8 text-stone-500 text-center">{dict.institutions.detail_no_students}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    {[dict.students.col_name, dict.students.col_category, dict.students.col_status, dict.students.col_dob].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allStudents.map(s => (
                    <tr key={s.id} className="table-row-hover border-b border-white/5 last:border-0">
                      <td className="table-td font-medium text-white">{s.full_name}</td>
                      <td className="table-td text-stone-300">{catMap[s.category_id] || '—'}</td>
                      <td className="table-td">
                        <span className={s.review_status === 'APPROVED' ? 'badge-approved' : s.review_status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
                          {s.review_status}
                        </span>
                      </td>
                      <td className="table-td text-stone-400">{formatDate(s.dob)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  )
}
