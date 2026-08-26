'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { approveInstitution, rejectInstitution, type InstitutionRead, type Region } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDate } from '@/lib/utils'
import { Check, X, Eye, Building2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'

const rejectSchema = z.object({ rejection_reason: z.string().min(5) })

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export default function InstitutionsClient({
  initialData, regions, dict, locale, token,
}: {
  initialData: InstitutionRead[], regions: Region[], dict: Dict, locale: string, token: string
}) {
  const t = dict.institutions
  const isAr = locale === 'ar'
  const [data, setData] = useState(initialData)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{ rejection_reason: string }>({
    resolver: zodResolver(rejectSchema)
  })

  const regionMap = useMemo(() => Object.fromEntries(regions.map(r => [r.id, isAr ? r.name_ar : r.name_en])), [regions, isAr])

  const filtered = useMemo(() =>
    filter === 'ALL' ? data : data.filter(i => i.status === filter)
  , [data, filter])

  async function handleApprove(id: number) {
    setApprovingId(id)
    try {
      const updated = await approveInstitution(token, id)
      setData(d => d.map(i => i.id === id ? updated : i))
      toast.success('Institution approved')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : dict.common.error) }
    finally { setApprovingId(null) }
  }

  async function onRejectSubmit({ rejection_reason }: { rejection_reason: string }) {
    if (!rejectingId) return
    try {
      const updated = await rejectInstitution(token, rejectingId, rejection_reason)
      setData(d => d.map(i => i.id === rejectingId ? updated : i))
      toast.success('Institution rejected')
      setRejectingId(null); reset()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : dict.common.error) }
  }

  const filters: StatusFilter[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']
  const filterLabels: Record<StatusFilter, string> = {
    ALL: t.filter_all, PENDING: t.filter_pending, APPROVED: t.filter_approved, REJECTED: t.filter_rejected
  }
  const filterCounts: Record<StatusFilter, number> = {
    ALL: data.length,
    PENDING: data.filter(i => i.status === 'PENDING').length,
    APPROVED: data.filter(i => i.status === 'APPROVED').length,
    REJECTED: data.filter(i => i.status === 'REJECTED').length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        subtitle={`${data.length} total registered Madrasas and institutions`}
      />

      {/* Filter Tabs matching jamia-admin */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                active 
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
              }`}
            >
              <span>{filterLabels[f]}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {filterCounts[f]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                {[t.col_name, t.col_type, t.col_region, t.col_status, t.col_created, t.col_actions].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No institutions found</p>
                  </td>
                </tr>
              ) : filtered.map(inst => (
                <tr key={inst.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td font-medium text-gray-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-[#c99335]">
                        <Building2 size={14} />
                      </div>
                      <span className="font-semibold text-gray-900">{inst.name}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                      {inst.type}
                    </span>
                  </td>
                  <td className="table-td text-gray-600 text-xs font-medium">
                    {inst.region_id ? regionMap[inst.region_id] || '—' : '—'}
                  </td>
                  <td className="table-td">
                    <span className={inst.status === 'APPROVED' ? 'badge-approved' : inst.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="table-td text-xs text-gray-500">
                    {formatDate(inst.created_at)}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/${locale}/dashboard/institutions/${inst.id}`}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors"
                        title={t.view_detail}
                      >
                        <Eye size={13} />
                      </Link>
                      {inst.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(inst.id)}
                            disabled={approvingId === inst.id}
                            className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title={t.approve}
                          >
                            {approvingId === inst.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button
                            onClick={() => { setRejectingId(inst.id); reset() }}
                            className="w-7 h-7 rounded-md flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                            title={t.reject}
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectingId}
        onClose={() => { setRejectingId(null); reset() }}
        title={t.reject_title}
        variant="danger"
      >
        <form onSubmit={handleSubmit(onRejectSubmit)} noValidate className="space-y-4">
          <div>
            <label className="label">{t.reject_reason_label}</label>
            <textarea
              {...register('rejection_reason')}
              rows={4}
              placeholder={t.reject_reason_placeholder}
              className="input-field resize-none"
            />
            {errors.rejection_reason && <p className="error-text">Reason required (min 5 chars)</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setRejectingId(null); reset() }} className="btn-secondary">
              {dict.common.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary !bg-rose-700 hover:!bg-rose-800">
              {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Rejecting...</> : t.reject_confirm}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
