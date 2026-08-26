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
  const judgeMap = useMemo(() => Object.fromEntries(judges.map(j => [j.id, j])), [judges])

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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400">{t.title}</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Gavel size={16} /> {t.create}
        </button>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-black/20">
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
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center py-12 text-stone-500">No rounds found</td></tr>
              )}
              {data.map(round => {
                const cat = catMap[round.category_id]
                const panel = panelAssignments[round.id] || []
                const isPanelValid = checkPanelValid(round)
                
                return (
                  <tr key={round.id} className="table-row-hover border-b border-white/5 last:border-0">
                    <td className="table-td text-stone-400">#{round.id}</td>
                    <td className="table-td font-medium text-white">{cat ? (isAr ? cat.name_ar : cat.name_en) : '—'}</td>
                    <td className="table-td">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-stone-300 font-medium border border-white/10">
                        {round.round_type === 'PRELIMINARY' ? t.type_preliminary : t.type_final}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={
                        round.status === 'ACTIVE' ? 'badge-approved' : 
                        round.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium' : 
                        'badge-pending'
                      }>
                        {round.status === 'ACTIVE' ? t.status_active : round.status === 'COMPLETED' ? t.status_completed : t.status_pending}
                      </span>
                    </td>
                    <td className="table-td text-stone-400">{formatDateTime(round.scheduled_at)}</td>
                    <td className="table-td">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-stone-500" />
                          <span className="text-sm text-stone-300">{panel.length} assigned</span>
                        </div>
                        {round.status === 'PENDING' && (
                          <div className={`text-xs ${isPanelValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isPanelValid ? t.panel_ok : (round.round_type === 'PRELIMINARY' ? t.panel_error_preliminary : t.panel_error_final)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        {round.status === 'PENDING' && (
                          <>
                            <button onClick={() => setAssigningRoundId(round.id)} className="btn-ghost px-3 py-1.5 text-xs">{t.assign_judge}</button>
                            <button onClick={() => handleStart(round.id)} disabled={!isPanelValid} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                              <Play size={12} /> {t.start}
                            </button>
                          </>
                        )}
                        {round.status === 'ACTIVE' && (
                          <>
                            <Link href={`/${locale}/dashboard/rounds/${round.id}/score`} className="btn-gold px-3 py-1.5 text-xs">{t.score}</Link>
                            <button onClick={() => handleComplete(round.id)} className="btn-ghost px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1">
                              <CheckCircle size={12} /> {t.complete}
                            </button>
                          </>
                        )}
                        {round.status === 'COMPLETED' && (
                          <span className="text-stone-500 text-sm">—</span>
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-6">{t.create_title}</h2>
            <form onSubmit={handleCreate(onCreateSubmit)} noValidate className="space-y-4">
              <div>
                <label className="label">{t.create_category}</label>
                <select {...regCreate('category_id')} className="input-field">
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.create_type}</label>
                <select {...regCreate('round_type')} className="input-field">
                  <option value="PRELIMINARY">{t.type_preliminary}</option>
                  <option value="FINAL">{t.type_final}</option>
                </select>
              </div>
              <div>
                <label className="label">{t.create_scheduled}</label>
                <input type="datetime-local" {...regCreate('scheduled_at')} className="input-field" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSubCreate} className="btn-primary flex-1">{t.create_submit}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">{tc.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningRoundId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-6">{t.assign_judge} - Round #{assigningRoundId}</h2>
            <form onSubmit={handleAssign(onAssignSubmit)} noValidate className="space-y-4">
              <div>
                <label className="label">Judge</label>
                <select {...regAssign('admin_user_id')} className="input-field">
                  <option value="">Select judge...</option>
                  {judges.map(j => <option key={j.id} value={j.id}>{j.name} ({j.email})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Role</label>
                <select {...regAssign('judge_role')} className="input-field">
                  <option value="REGULAR">Regular</option>
                  <option value="GUEST_NEUTRAL">Guest Neutral</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSubAssign} className="btn-primary flex-1">Assign</button>
                <button type="button" onClick={() => setAssigningRoundId(null)} className="btn-ghost">{tc.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
