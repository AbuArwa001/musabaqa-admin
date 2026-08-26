import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { getInstitution, listStudents, listCategories } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
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
    <div className="space-y-6">
      <Link href={`/${locale}/dashboard/institutions`} className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-xs font-semibold">
        <ArrowLeft size={14} /> Back to Institutions
      </Link>

      {/* Institution Info Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-[#c99335] flex items-center justify-center shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">{inst.name}</h1>
              <p className="text-gray-600 text-xs mt-1 font-medium">{inst.type} · {inst.email} · {inst.phone}</p>
              <p className="text-gray-400 text-xs mt-0.5">Contact: {inst.contact_person || '—'}</p>
            </div>
          </div>
          <span className={inst.status === 'APPROVED' ? 'badge-approved text-xs px-3 py-1' : inst.status === 'REJECTED' ? 'badge-rejected text-xs px-3 py-1' : 'badge-pending text-xs px-3 py-1'}>
            {inst.status}
          </span>
        </div>
        {inst.rejection_reason && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-800 text-xs">
            <span className="font-bold">Rejection reason:</span> {inst.rejection_reason}
          </div>
        )}
      </div>

      {/* Students Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <h2 className="font-serif font-bold text-sm text-gray-900">{dict.institutions.detail_students} ({allStudents.length})</h2>
        </div>
        {allStudents.length === 0
          ? <p className="p-8 text-gray-400 text-center text-xs font-medium">{dict.institutions.detail_no_students}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/60 border-b border-gray-200">
                  <tr>
                    {[dict.students.col_name, dict.students.col_category, dict.students.col_status, dict.students.col_dob].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allStudents.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="table-td font-semibold text-gray-900">{s.full_name}</td>
                      <td className="table-td text-gray-700 text-xs">{catMap[s.category_id] || '—'}</td>
                      <td className="table-td">
                        <span className={s.review_status === 'APPROVED' ? 'badge-approved' : s.review_status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
                          {s.review_status}
                        </span>
                      </td>
                      <td className="table-td text-gray-500 text-xs">{formatDate(s.dob)}</td>
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
