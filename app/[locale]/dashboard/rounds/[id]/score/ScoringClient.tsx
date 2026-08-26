'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  submitDeduction, getMyScore, getAdminWsUrl,
  type RoundRead, type StudentRead, type RoundResult, type JudgeScoreSummary
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { ArrowLeft, AlertCircle, RefreshCcw, CheckCircle } from 'lucide-react'

const DEDUCTION_TYPES = [
  { id: 1, name_en: 'Memorization Error', name_ar: 'خطأ في الحفظ', default_amount: 0.5 },
  { id: 2, name_en: 'Tajweed Minor', name_ar: 'خطأ تجويد خفي', default_amount: 0.25 },
  { id: 3, name_en: 'Tajweed Major', name_ar: 'خطأ تجويد جلي', default_amount: 1.0 },
]

export default function ScoringClient({ 
  round, students, results, dict, locale, token, currentUserId 
}: { 
  round: RoundRead, students: StudentRead[], results: RoundResult[], dict: Dict, locale: string, token: string, currentUserId: number 
}) {
  const t = dict.rounds
  const tc = dict.common
  const isAr = locale === 'ar'

  const [activeStudentId, setActiveStudentId] = useState<number | null>(students.length > 0 ? students[0].id : null)
  const [myScore, setMyScore] = useState<JudgeScoreSummary | null>(null)
  const [deductions, setDeductions] = useState<Record<number, number>>({})
  const [wsConnected, setWsConnected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeStudent = students.find(s => s.id === activeStudentId)
  const currentResult = results.find(r => r.student_id === activeStudentId)

  useEffect(() => {
    if (!activeStudentId) return
    setDeductions({})
    setMyScore(null)
    getMyScore(token, round.id, activeStudentId).then(setMyScore).catch(() => {})
  }, [activeStudentId, round.id, token])

  useEffect(() => {
    const ws = new WebSocket(getAdminWsUrl(token))
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    return () => ws.close()
  }, [token])

  const handleDeduction = async (typeId: number, amount: number) => {
    if (!activeStudentId || round.status !== 'ACTIVE') return
    try {
      setIsSubmitting(true)
      await submitDeduction(token, { round_id: round.id, student_id: activeStudentId, deduction_type_id: typeId, amount })
      setDeductions(prev => ({ ...prev, [typeId]: (prev[typeId] || 0) + 1 }))
      toast.success('Deduction logged')
      const updated = await getMyScore(token, round.id, activeStudentId)
      setMyScore(updated)
    } catch (e: any) { 
      toast.error(e.message || tc.error) 
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalDeducted = DEDUCTION_TYPES.reduce((acc, dt) => acc + (deductions[dt.id] || 0) * dt.default_amount, 0)
  const runningScore = myScore ? myScore.total_score : (100 - totalDeducted)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <Link href={`/${locale}/dashboard/rounds`} className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Rounds
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={wsConnected ? 'text-emerald-400' : 'text-red-400'}>
            {wsConnected ? dict.live.connected : dict.live.disconnected}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 glass overflow-hidden h-[calc(100vh-160px)] flex flex-col">
          <div className="p-4 border-b border-white/10 bg-black/20">
            <h2 className="font-semibold text-white">Roster</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveStudentId(s.id)}
                className={`w-full text-left p-4 border-b border-white/5 transition-colors ${activeStudentId === s.id ? 'bg-amber-600/20 border-l-4 border-l-amber-500' : 'hover:bg-white/5 border-l-4 border-l-transparent'}`}
              >
                <p className={`font-medium ${activeStudentId === s.id ? 'text-amber-400' : 'text-stone-300'}`}>{s.full_name}</p>
                {results.find(r => r.student_id === s.id) && (
                  <span className="text-xs text-emerald-500 mt-1 block">Completed</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeStudent ? (
            <div className="glass p-8 min-h-[calc(100vh-160px)] flex flex-col">
              <div className="flex items-start justify-between mb-8 border-b border-white/10 pb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">{activeStudent.full_name}</h1>
                  <p className="text-stone-400 mt-1">Round #{round.id} — {round.round_type}</p>
                </div>
                <div className={`text-${isAr ? 'left' : 'right'}`}>
                  <p className="text-stone-400 text-sm mb-1">{t.scoring_running}</p>
                  <p className="text-5xl font-bold text-amber-400 drop-shadow-[0_0_15px_rgba(201,147,53,0.3)]">
                    {runningScore.toFixed(2)}
                  </p>
                </div>
              </div>

              {round.status !== 'ACTIVE' && (
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 mb-8">
                  <AlertCircle className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-red-400 font-semibold">Round is not active</h3>
                    <p className="text-red-400/80 text-sm mt-1">You cannot submit scores until the round is started.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-auto">
                {DEDUCTION_TYPES.map(dt => (
                  <button
                    key={dt.id}
                    disabled={round.status !== 'ACTIVE' || isSubmitting}
                    onClick={() => handleDeduction(dt.id, dt.default_amount)}
                    className="group relative p-6 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-500/40 hover:bg-amber-600/5 transition-all text-left flex justify-between items-center overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700" />
                    <div>
                      <p className="font-semibold text-white text-lg">{isAr ? dt.name_ar : dt.name_en}</p>
                      <p className="text-red-400 text-sm mt-1">-{dt.default_amount} points</p>
                    </div>
                    {deductions[dt.id] > 0 && (
                      <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">
                        {deductions[dt.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                <div>
                  {currentResult ? (
                    <div className="text-emerald-400 flex items-center gap-2">
                      <CheckCircle size={18} /> Panel score computed: {currentResult.final_score.toFixed(2)}
                    </div>
                  ) : myScore?.all_judges_submitted ? (
                    <div className="text-emerald-400">{t.scoring_submitted}</div>
                  ) : (
                    <div className="text-stone-400 text-sm">{t.panel_score_pending}</div>
                  )}
                </div>
                <button
                  onClick={() => activeStudentId && getMyScore(token, round.id, activeStudentId).then(setMyScore)}
                  className="btn-ghost flex items-center gap-2"
                >
                  <RefreshCcw size={16} /> Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="glass p-8 min-h-[calc(100vh-160px)] flex items-center justify-center text-stone-500">
              Select a student from the roster to begin scoring
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
