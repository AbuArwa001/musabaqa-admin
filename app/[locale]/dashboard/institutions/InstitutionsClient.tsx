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

const filterMeta: Record<StatusFilter, { color: string; bg: string; border: string; activeBg: string }> = {
  ALL:      { color: '#a78bfa', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.15)', activeBg: 'rgba(167,139,250,0.15)' },
  PENDING:  { color: '#f0c060', bg: 'rgba(240,192,96,0.06)',  border: 'rgba(240,192,96,0.15)',  activeBg: 'rgba(240,192,96,0.15)' },
  APPROVED: { color: '#00d88a', bg: 'rgba(0,216,138,0.06)',   border: 'rgba(0,216,138,0.15)',   activeBg: 'rgba(0,216,138,0.15)' },
  REJECTED: { color: '#f56b7e', bg: 'rgba(245,107,126,0.06)', border: 'rgba(245,107,126,0.15)', activeBg: 'rgba(245,107,126,0.15)' },
}

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
    <div className="animate-fade-slide-up">
      <PageHeader
        title={t.title}
        subtitle={`${data.length} total institutions`}
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(f => {
          const m = filterMeta[f]
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: active ? m.activeBg : m.bg,
                border: `1px solid ${active ? m.color + '40' : m.border}`,
                color: active ? m.color : 'rgba(160,160,192,0.65)',
                boxShadow: active ? `0 0 16px ${m.color}20` : 'none',
                fontFamily: 'var(--font-display)',
              }}
            >
              {filterLabels[f]}
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                style={{
                  background: active ? `${m.color}25` : 'rgba(255,255,255,0.06)',
                  color: active ? m.color : 'rgba(160,160,192,0.5)',
                }}
              >
                {filterCounts[f]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
              <tr>
                {[t.col_name, t.col_type, t.col_region, t.col_status, t.col_created, t.col_actions].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                        <Building2 size={20} style={{ color: '#a78bfa' }} />
                      </div>
                      <p style={{ color: 'rgba(160,160,192,0.5)', fontSize: '0.875rem' }}>No institutions found</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(inst => (
                <tr key={inst.id} className="table-row-hover">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: 'rgba(240,192,96,0.1)', border: '1px solid rgba(240,192,96,0.2)' }}
                      >
                        <Building2 size={14} style={{ color: '#f0c060' }} />
                      </div>
                      <span className="font-semibold text-sm" style={{ color: '#f0f0ff', fontFamily: 'var(--font-display)' }}>
                        {inst.name}
                      </span>
                    </div>
                  </td>
                  <td className="table-td">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(91,141,245,0.1)', color: '#5b8df5', border: '1px solid rgba(91,141,245,0.2)', fontFamily: 'var(--font-display)' }}
                    >
                      {inst.type}
                    </span>
                  </td>
                  <td className="table-td">
                    <span style={{ color: 'rgba(240,240,255,0.65)' }}>
                      {inst.region_id ? regionMap[inst.region_id] || '—' : '—'}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={inst.status === 'APPROVED' ? 'badge-approved' : inst.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="table-td">
                    <span style={{ color: 'rgba(160,160,192,0.6)', fontSize: '0.8125rem' }}>{formatDate(inst.created_at)}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/${locale}/dashboard/institutions/${inst.id}`}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
                        style={{ background: 'rgba(91,141,245,0.1)', border: '1px solid rgba(91,141,245,0.2)', color: '#5b8df5' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(91,141,245,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(91,141,245,0.3)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(91,141,245,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                        title={t.view_detail}
                      >
                        <Eye size={13} />
                      </Link>
                      {inst.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(inst.id)}
                            disabled={approvingId === inst.id}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
                            style={{ background: 'rgba(0,216,138,0.1)', border: '1px solid rgba(0,216,138,0.2)', color: '#00d88a' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,216,138,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0,216,138,0.3)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,216,138,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                            title={t.approve}
                          >
                            {approvingId === inst.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button
                            onClick={() => { setRejectingId(inst.id); reset() }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
                            style={{ background: 'rgba(245,107,126,0.1)', border: '1px solid rgba(245,107,126,0.2)', color: '#f56b7e' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,107,126,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(245,107,126,0.3)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,107,126,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
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
        <form onSubmit={handleSubmit(onRejectSubmit)} noValidate className="space-y-5">
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
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-danger flex-1">
              {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Rejecting...</> : t.reject_confirm}
            </button>
            <button type="button" onClick={() => { setRejectingId(null); reset() }} className="btn-ghost">
              {dict.common.cancel}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
