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
  round, students, results, dict, locale, token 
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/dashboard/rounds`} className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-xs font-semibold">
          <ArrowLeft size={14} /> Back to Rounds
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={wsConnected ? 'text-emerald-700' : 'text-rose-700'}>
            {wsConnected ? dict.live.connected : dict.live.disconnected}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roster list */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-190px)]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/80">
            <h2 className="font-serif font-bold text-sm text-gray-900">Student Roster</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveStudentId(s.id)}
                className={`w-full text-left p-3.5 transition-colors cursor-pointer ${activeStudentId === s.id ? 'bg-amber-50/80 border-l-4 border-l-[#c99335]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <p className={`font-semibold text-sm ${activeStudentId === s.id ? 'text-amber-900' : 'text-gray-800'}`}>{s.full_name}</p>
                {results.find(r => r.student_id === s.id) && (
                  <span className="text-[11px] font-bold text-emerald-700 mt-0.5 block">✓ Completed</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scoring Console */}
        <div className="lg:col-span-3">
          {activeStudent ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 min-h-[calc(100vh-190px)] flex flex-col shadow-sm">
              <div className="flex items-start justify-between mb-8 border-b border-gray-100 pb-6">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-gray-900">{activeStudent.full_name}</h1>
                  <p className="text-gray-500 text-xs mt-1 font-medium">Round #{round.id} — {round.round_type}</p>
                </div>
                <div className={`text-${isAr ? 'left' : 'right'}`}>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{t.scoring_running}</p>
                  <p className="text-5xl font-bold font-serif text-[#006838]">
                    {runningScore.toFixed(2)}
                  </p>
                </div>
              </div>

              {round.status !== 'ACTIVE' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 mb-8">
                  <AlertCircle className="text-amber-700 shrink-0 mt-0.5 w-5 h-5" />
                  <div>
                    <h3 className="text-amber-900 font-bold text-sm">Round is not active</h3>
                    <p className="text-amber-800 text-xs mt-0.5">You cannot submit deduction scores until the round is started by the administrator.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-auto">
                {DEDUCTION_TYPES.map(dt => (
                  <button
                    key={dt.id}
                    disabled={round.status !== 'ACTIVE' || isSubmitting}
                    onClick={() => handleDeduction(dt.id, dt.default_amount)}
                    className="p-5 rounded-xl bg-gray-50 border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
                  >
                    <div>
                      <p className="font-bold text-gray-900 text-sm font-serif">{isAr ? dt.name_ar : dt.name_en}</p>
                      <p className="text-rose-600 text-xs font-semibold mt-1">-{dt.default_amount} points</p>
                    </div>
                    {deductions[dt.id] > 0 && (
                      <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                        {deductions[dt.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div>
                  {currentResult ? (
                    <div className="text-emerald-700 font-semibold text-sm flex items-center gap-1.5">
                      <CheckCircle size={16} /> Panel score computed: {currentResult.final_score.toFixed(2)}
                    </div>
                  ) : myScore?.all_judges_submitted ? (
                    <div className="text-emerald-700 font-semibold text-sm">{t.scoring_submitted}</div>
                  ) : (
                    <div className="text-gray-500 text-xs">{t.panel_score_pending}</div>
                  )}
                </div>
                <button
                  onClick={() => activeStudentId && getMyScore(token, round.id, activeStudentId).then(setMyScore)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <RefreshCcw size={13} /> Refresh Score
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-8 min-h-[calc(100vh-190px)] flex items-center justify-center text-gray-400 text-sm">
              Select a contestant from the roster to begin live judging
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
