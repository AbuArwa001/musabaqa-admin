'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { approveInstitution, rejectInstitution, type InstitutionRead, type Region } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDate } from '@/lib/utils'
import { Check, X, Eye } from 'lucide-react'
import Link from 'next/link'

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
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{ rejection_reason: string }>({
    resolver: zodResolver(rejectSchema)
  })

  const regionMap = useMemo(() => Object.fromEntries(regions.map(r => [r.id, isAr ? r.name_ar : r.name_en])), [regions, isAr])

  const filtered = useMemo(() =>
    filter === 'ALL' ? data : data.filter(i => i.status === filter)
  , [data, filter])

  async function handleApprove(id: number) {
    try {
      const updated = await approveInstitution(token, id)
      setData(d => d.map(i => i.id === id ? updated : i))
      toast.success('Institution approved')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : dict.common.error) }
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
  const filterLabels: Record<StatusFilter, string> = { ALL: t.filter_all, PENDING: t.filter_pending, APPROVED: t.filter_approved, REJECTED: t.filter_rejected }

  return (
    <div>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400 mb-8">{t.title}</h1>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
              filter === f
                ? 'bg-amber-600/20 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(201,147,53,0.15)]'
                : 'bg-white/5 border-white/10 text-stone-400 hover:text-white hover:bg-white/10'
            }`}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                {[t.col_name, t.col_type, t.col_region, t.col_status, t.col_created, t.col_actions].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="table-td text-center text-stone-500 py-12">No institutions found</td></tr>
              )}
              {filtered.map(inst => (
                <tr key={inst.id} className="table-row-hover border-b border-white/5 last:border-0">
                  <td className="table-td font-medium text-white">{inst.name}</td>
                  <td className="table-td text-stone-300">{inst.type}</td>
                  <td className="table-td text-stone-300">{inst.region_id ? regionMap[inst.region_id] || '—' : '—'}</td>
                  <td className="table-td">
                    <span className={inst.status === 'APPROVED' ? 'badge-approved' : inst.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="table-td text-stone-400">{formatDate(inst.created_at)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Link href={`/${locale}/dashboard/institutions/${inst.id}`}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title={t.view_detail}>
                        <Eye size={15} />
                      </Link>
                      {inst.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(inst.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title={t.approve}>
                            <Check size={15} />
                          </button>
                          <button onClick={() => { setRejectingId(inst.id); reset() }}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title={t.reject}>
                            <X size={15} />
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
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass p-8 w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-bold text-white mb-6">{t.reject_title}</h2>
            <form onSubmit={handleSubmit(onRejectSubmit)} noValidate className="space-y-4">
              <div>
                <label className="label">{t.reject_reason_label}</label>
                <textarea {...register('rejection_reason')} rows={4}
                  placeholder={t.reject_reason_placeholder}
                  className="input-field resize-none" />
                {errors.rejection_reason && <p className="error-text">Reason required (min 5 chars)</p>}
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSubmitting} className="btn-danger flex-1">{t.reject_confirm}</button>
                <button type="button" onClick={() => { setRejectingId(null); reset() }} className="btn-ghost">{dict.common.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
