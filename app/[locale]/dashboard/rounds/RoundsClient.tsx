'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  createRound, startRound, completeRound, assignJudge, getRoundJudges,
  type RoundRead, type Category, type AdminUserRead, type JudgeAssignment
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDateTime } from '@/lib/utils'
import { Play, CheckCircle, Users, Gavel } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

const createSchema = z.object({
  category_id: z.string().min(1),
  round_type: z.enum(['PRELIMINARY', 'FINAL']),
  scheduled_at: z.string().min(1)
})
type CreateForm = z.infer<typeof createSchema>

const assignSchema = z.object({
  admin_user_id: z.string().min(1),
  judge_role: z.enum(['REGULAR', 'GUEST_NEUTRAL'])
})

export default function RoundsClient({ initialData, categories, judges, dict, locale, token }: { initialData: RoundRead[], categories: Category[], judges: AdminUserRead[], dict: Dict, locale: string, token: string }) {
  const t = dict.rounds
  const tc = dict.common
  const isAr = locale === 'ar'

  const [data, setData] = useState(initialData)
  const [showCreate, setShowCreate] = useState(false)
  const [assigningRoundId, setAssigningRoundId] = useState<number | null>(null)
  const [panelAssignments, setPanelAssignments] = useState<Record<number, JudgeAssignment[]>>({})

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { isSubmitting: isSubCreate } } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const { register: regAssign, handleSubmit: handleAssign, reset: resetAssign, formState: { isSubmitting: isSubAssign } } = useForm<z.infer<typeof assignSchema>>({ resolver: zodResolver(assignSchema) })

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])

  useEffect(() => {
    data.forEach(r => {
      getRoundJudges(token, r.id).then(j => setPanelAssignments(prev => ({ ...prev, [r.id]: j }))).catch(() => {})
    })
  }, [data, token])

  const onCreateSubmit = async (formData: CreateForm) => {
    try {
      const created = await createRound(token, { category_id: Number(formData.category_id), round_type: formData.round_type, scheduled_at: new Date(formData.scheduled_at).toISOString() })
      setData(d => [created, ...d])
      toast.success('Round created')
      setShowCreate(false)
      resetCreate()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleStart = async (id: number) => {
    try {
      const updated = await startRound(token, id)
      setData(d => d.map(r => r.id === id ? updated : r))
      toast.success('Round started')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleComplete = async (id: number) => {
    try {
      const updated = await completeRound(token, id)
      setData(d => d.map(r => r.id === id ? updated : r))
      toast.success('Round completed')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const onAssignSubmit = async (formData: z.infer<typeof assignSchema>) => {
    if (!assigningRoundId) return
    try {
      const assigned = await assignJudge(token, assigningRoundId, { admin_user_id: Number(formData.admin_user_id), judge_role: formData.judge_role })
      setPanelAssignments(prev => ({ ...prev, [assigningRoundId]: [...(prev[assigningRoundId] || []), assigned] }))
      toast.success('Judge assigned')
      setAssigningRoundId(null)
      resetAssign()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const checkPanelValid = (round: RoundRead) => {
    const panel = panelAssignments[round.id] || []
    const regulars = panel.filter(j => j.judge_role === 'REGULAR').length
    const neutrals = panel.filter(j => j.judge_role === 'GUEST_NEUTRAL').length
    if (round.round_type === 'PRELIMINARY') return regulars === 3
    return regulars === 3 && neutrals === 1
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        subtitle="Manage preliminary and final competition rounds and jury assignments"
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Gavel size={16} /> {t.create}
          </button>
        }
      />

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">{t.col_category}</th>
                <th className="table-th">{t.col_type}</th>
                <th className="table-th">{t.col_status}</th>
                <th className="table-th">{t.col_scheduled}</th>
                <th className="table-th">{t.col_judges}</th>
                <th className="table-th text-right">{t.col_actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center py-12 text-gray-400">No rounds created yet</td></tr>
              )}
              {data.map(round => {
                const cat = catMap[round.category_id]
                const panel = panelAssignments[round.id] || []
                const isPanelValid = checkPanelValid(round)
                
                return (
                  <tr key={round.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-td text-gray-500 font-mono text-xs">#{round.id}</td>
                    <td className="table-td font-semibold text-gray-900">{cat ? (isAr ? cat.name_ar : cat.name_en) : '—'}</td>
                    <td className="table-td">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200">
                        {round.round_type === 'PRELIMINARY' ? t.type_preliminary : t.type_final}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={
                        round.status === 'ACTIVE' ? 'badge-approved' : 
                        round.status === 'COMPLETED' ? 'bg-sky-50 text-sky-800 border border-sky-200 text-xs px-2 py-0.5 rounded-full font-medium' : 
                        'badge-pending'
                      }>
                        {round.status === 'ACTIVE' ? t.status_active : round.status === 'COMPLETED' ? t.status_completed : t.status_pending}
                      </span>
                    </td>
                    <td className="table-td text-gray-500 text-xs">{formatDateTime(round.scheduled_at)}</td>
                    <td className="table-td">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                          <Users size={13} className="text-gray-400" />
                          <span>{panel.length} assigned</span>
                        </div>
                        {round.status === 'PENDING' && (
                          <div className={`text-[11px] font-semibold ${isPanelValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isPanelValid ? t.panel_ok : (round.round_type === 'PRELIMINARY' ? t.panel_error_preliminary : t.panel_error_final)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        {round.status === 'PENDING' && (
                          <>
                            <button onClick={() => setAssigningRoundId(round.id)} className="btn-secondary !py-1 !px-2.5 text-xs">{t.assign_judge}</button>
                            <button onClick={() => handleStart(round.id)} disabled={!isPanelValid} className="btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1">
                              <Play size={11} /> {t.start}
                            </button>
                          </>
                        )}
                        {round.status === 'ACTIVE' && (
                          <>
                            <Link href={`/${locale}/dashboard/rounds/${round.id}/score`} className="btn-gold !py-1 !px-2.5 text-xs">{t.score}</Link>
                            <button onClick={() => handleComplete(round.id)} className="btn-secondary !py-1 !px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-1">
                              <CheckCircle size={11} /> {t.complete}
                            </button>
                          </>
                        )}
                        {round.status === 'COMPLETED' && (
                          <span className="text-gray-400 text-xs font-medium">Finished</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Round Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.create_title}>
        <form onSubmit={handleCreate(onCreateSubmit)} noValidate className="space-y-4">
          <div>
            <label className="label">{t.create_category}</label>
            <select {...regCreate('category_id')} className="input-field cursor-pointer">
              <option value="">Select Category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t.create_type}</label>
            <select {...regCreate('round_type')} className="input-field cursor-pointer">
              <option value="PRELIMINARY">{t.type_preliminary}</option>
              <option value="FINAL">{t.type_final}</option>
            </select>
          </div>
          <div>
            <label className="label">{t.create_scheduled}</label>
            <input type="datetime-local" {...regCreate('scheduled_at')} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">{tc.cancel}</button>
            <button type="submit" disabled={isSubCreate} className="btn-primary">{t.create_submit}</button>
          </div>
        </form>
      </Modal>

      {/* Assign Judge Modal */}
      <Modal isOpen={!!assigningRoundId} onClose={() => setAssigningRoundId(null)} title={`${t.assign_judge} - Round #${assigningRoundId}`}>
        <form onSubmit={handleAssign(onAssignSubmit)} noValidate className="space-y-4">
          <div>
            <label className="label">Judge</label>
            <select {...regAssign('admin_user_id')} className="input-field cursor-pointer">
              <option value="">Select judge...</option>
              {judges.map(j => <option key={j.id} value={j.id}>{j.name} ({j.email})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Role</label>
            <select {...regAssign('judge_role')} className="input-field cursor-pointer">
              <option value="REGULAR">Regular Judge</option>
              <option value="GUEST_NEUTRAL">Guest Neutral Judge</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button type="button" onClick={() => setAssigningRoundId(null)} className="btn-secondary">{tc.cancel}</button>
            <button type="submit" disabled={isSubAssign} className="btn-primary">Assign Judge</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
