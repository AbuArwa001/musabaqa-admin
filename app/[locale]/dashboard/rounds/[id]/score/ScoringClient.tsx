'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  submitDeduction, deleteDeduction, getMyScore, getAdminWsUrl, setActiveStudent,
  saveRoundQuestion, listRoundQuestions, getOfficialSheet,
  getRoundDeductionTypes, setRubricMode as setRubricModeApi,
  getCompetitionConfig, saveCompetitionConfig,
  type RoundRead, type StudentRead, type RoundResult, type JudgeScoreSummary, 
  type DeductionTypeOut, type RoundQuestionRead, type OfficialSheetRead
} from '@/lib/api'
import { QURAN_SURAHS, searchSurahs } from '@/lib/quranData'
import type { Dict } from '@/lib/dictionaries'
import { 
  ArrowLeft, AlertCircle, RefreshCcw, CheckCircle, PlayCircle, 
  Printer, Undo2, Mail, X, Check, BookOpen, AlertTriangle, FileText, ChevronRight, Scale
} from 'lucide-react'

export default function ScoringClient({ 
  round, students, results, deductionTypes, initialRubricMode, dict, locale, token, currentUserId, role
}: { 
  round: RoundRead, students: StudentRead[], results: RoundResult[], deductionTypes: DeductionTypeOut[], initialRubricMode?: 'OFFICIAL_70_30' | 'TRADITIONAL_TIERED', dict: Dict, locale: string, token: string, currentUserId: number, role: string
}) {
  const t = dict.rounds
  const tc = dict.common
  const isAr = locale === 'ar'
  const isModerator = role === 'MODERATOR' || role === 'SUPERADMIN'

  // Active Rubric Mode state (OFFICIAL_70_30 or TRADITIONAL_TIERED)
  const [rubricMode, setRubricMode] = useState<'OFFICIAL_70_30' | 'TRADITIONAL_TIERED'>(initialRubricMode || 'OFFICIAL_70_30')
  const [activeDeductionTypes, setActiveDeductionTypes] = useState<DeductionTypeOut[]>(deductionTypes)
  const [customSautDeduct, setCustomSautDeduct] = useState('')
  const [customTafsirDeduct, setCustomTafsirDeduct] = useState('')

  // Synchronize rubric mode with local settings and fetch latest deduction types on mount & storage change
  useEffect(() => {
    const config = getCompetitionConfig()
    if (config?.rubric_mode) {
      setRubricMode(config.rubric_mode)
    }

    getRoundDeductionTypes(token, round.id)
      .then(res => {
        if (res.rubric_mode) {
          setRubricMode(res.rubric_mode)
          const currentConfig = getCompetitionConfig()
          saveCompetitionConfig({ ...currentConfig, rubric_mode: res.rubric_mode })
        }
        if (res.deduction_types?.length) {
          setActiveDeductionTypes(res.deduction_types)
        }
      })
      .catch(e => console.warn('Could not refresh deduction types:', e))

    const onStorage = () => {
      const updated = getCompetitionConfig()
      if (updated?.rubric_mode) {
        setRubricMode(updated.rubric_mode)
        getRoundDeductionTypes(token, round.id)
          .then(res => {
            if (res.deduction_types?.length) setActiveDeductionTypes(res.deduction_types)
          })
          .catch(() => {})
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [round.id, token])

  // Default to round's active student if set, else first student for Moderators
  const initialActive = round.active_student_id || (isModerator && students.length > 0 ? students[0].id : null)
  const [activeStudentId, setActiveStudentId] = useState<number | null>(initialActive)
  const [liveQueuedStudentId, setLiveQueuedStudentId] = useState<number | null>(round.active_student_id)
  
  // Scoring state
  const [selectedQuestion, setSelectedQuestion] = useState<number>(1)
  const [myScore, setMyScore] = useState<JudgeScoreSummary | null>(null)
  const [questionsMeta, setQuestionsMeta] = useState<Record<number, RoundQuestionRead>>({})
  const [recentDeductions, setRecentDeductions] = useState<Array<{ id: number; question_number: number; deduction_type_id: number; amount: number }>>([])
  
  // Envelope & Question Drawer
  const [showEnvelopeDrawer, setShowEnvelopeDrawer] = useState(false)
  const [envelopeNumber, setEnvelopeNumber] = useState('')
  const [drawerQuestions, setDrawerQuestions] = useState<Record<number, { surah_name: string; ayah_from: string; ayah_to: string }>>({
    1: { surah_name: '', ayah_from: '', ayah_to: '' },
    2: { surah_name: '', ayah_from: '', ayah_to: '' },
    3: { surah_name: '', ayah_from: '', ayah_to: '' },
    4: { surah_name: '', ayah_from: '', ayah_to: '' },
  })
  const [surahSearchQuery, setSurahSearchQuery] = useState('')

  // Printable Official Sheet Modal
  const [showSheetModal, setShowSheetModal] = useState(false)
  const [officialSheet, setOfficialSheet] = useState<OfficialSheetRead | null>(null)

  const [wsConnected, setWsConnected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeStudent = students.find(s => s.id === activeStudentId)
  const currentResult = results.find(r => r.student_id === activeStudentId)
  const isViewingLive = activeStudentId === liveQueuedStudentId

  // Category determination (Branch 1/2: 4 questions, Branch 3/4: 3 questions)
  const catName = (round.category_name_en || '').toLowerCase()
  const isBranch3or4 = catName.includes('10') || catName.includes('15') || catName.includes('5') || round.category_id === 1 || round.category_id === 2
  const totalQuestions = isBranch3or4 ? 3 : 4
  const branchNumber = (catName.includes('30') || round.category_id === 4) ? 30 
    : (catName.includes('20') || round.category_id === 3) ? 20 
    : (catName.includes('10') || catName.includes('15') || round.category_id === 2) ? 10 
    : 5
  const questionAllotment = Number((100 / totalQuestions).toFixed(2))

  // Fetch score summary and questions when active student changes
  const loadStudentData = async (studentId: number) => {
    try {
      const [scoreRes, qList] = await Promise.all([
        getMyScore(token, round.id, studentId),
        listRoundQuestions(token, round.id, studentId)
      ])
      setMyScore(scoreRes)
      if (scoreRes.rubric_mode) {
        setRubricMode(scoreRes.rubric_mode as any)
      }

      const qMap: Record<number, RoundQuestionRead> = {}
      const dMap: Record<number, { surah_name: string; ayah_from: string; ayah_to: string }> = {
        1: { surah_name: '', ayah_from: '', ayah_to: '' },
        2: { surah_name: '', ayah_from: '', ayah_to: '' },
        3: { surah_name: '', ayah_from: '', ayah_to: '' },
        4: { surah_name: '', ayah_from: '', ayah_to: '' },
      }
      
      let foundEnv = ''
      qList.forEach(q => {
        qMap[q.question_number] = q
        dMap[q.question_number] = {
          surah_name: q.surah_name || '',
          ayah_from: q.ayah_from ? q.ayah_from.toString() : '',
          ayah_to: q.ayah_to ? q.ayah_to.toString() : '',
        }
        if (q.envelope_number) foundEnv = q.envelope_number
      })
      
      setQuestionsMeta(qMap)
      setDrawerQuestions(dMap)
      if (foundEnv) setEnvelopeNumber(foundEnv)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!activeStudentId) return
    setSelectedQuestion(1)
    setRecentDeductions([])
    loadStudentData(activeStudentId)
  }, [activeStudentId, round.id, token])

  // WebSocket Live Sync
  useEffect(() => {
    const ws = new WebSocket(getAdminWsUrl(token))
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'ACTIVE_STUDENT_CHANGED' && data.round_id === round.id) {
          setLiveQueuedStudentId(data.student_id)
          if (!isModerator || data.student_id) {
            setActiveStudentId(data.student_id)
          }
        } else if (data.type === 'SCORE_UPDATED' && data.round_id === round.id) {
          if (activeStudentId !== null && activeStudentId === data.student_id) {
            getMyScore(token, round.id, activeStudentId).then(setMyScore).catch(() => {})
          }
        } else if (data.type === 'RUBRIC_MODE_CHANGED') {
          if (data.rubric_mode) {
            setRubricMode(data.rubric_mode)
            const cfg = getCompetitionConfig()
            saveCompetitionConfig({ ...cfg, rubric_mode: data.rubric_mode })
            getRoundDeductionTypes(token, round.id)
              .then(res => {
                if (res.deduction_types?.length) setActiveDeductionTypes(res.deduction_types)
              })
              .catch(() => {})
          }
          if (activeStudentId !== null) {
            loadStudentData(activeStudentId)
          }
        }
      } catch (e) {}
    }
    return () => ws.close()
  }, [token, round.id, isModerator, activeStudentId])


  const handleSetLive = async () => {
    if (!activeStudentId || !isModerator) return
    try {
      setIsSubmitting(true)
      await setActiveStudent(token, round.id, activeStudentId)
      toast.success('المتسابق الآن على المسرح لجميع المحكّمين / Contestant is live for judges')
    } catch (e: any) {
      toast.error(e.message || 'Failed to set live contestant')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Deductions mapped to the official rubric
  // 1: Tanbeeh (-1.0)
  // 2: Al-Fath (-2.0)
  // 3: Al-Lahn (-2.0)
  // 4: Tajweed (-0.5)
  const officialDeductionCards = useMemo(() => {
    return [
      {
        key: 'tanbeeh',
        name_ar: 'التنبيه',
        name_en: 'Tanbeeh (Warning)',
        desc_ar: 'خصم درجة واحدة (تردد / تلعثم / إعادة)',
        desc_en: 'Warning / Hesitation (-1.0 pt)',
        amount: 1.0,
        isWarning: true,
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/30 text-amber-900',
        badgeColor: 'bg-amber-500 text-white',
        targetType: activeDeductionTypes.find(d => d.name_ar.includes('تنبيه') || d.name_en.toLowerCase().includes('tanbeeh') || (d.criteria_name === 'Memorization' && d.points_deducted === 1.0))
      },
      {
        key: 'fath',
        name_ar: 'الفتح',
        name_en: 'Al-Fath (Prompting)',
        desc_ar: 'خصم درجتين (فتح / تلقين / تصحيح مباشر)',
        desc_en: 'Direct Prompting Correction (-2.0 pts)',
        amount: 2.0,
        isWarning: false,
        bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-400/30 text-rose-900',
        badgeColor: 'bg-rose-600 text-white',
        targetType: activeDeductionTypes.find(d => d.name_ar.includes('الفتح') || d.name_en.toLowerCase().includes('fath') || (d.criteria_name === 'Memorization' && d.points_deducted === 2.0))
      },
      {
        key: 'lahn',
        name_ar: 'اللحن',
        name_en: 'Al-Lahn (Vocalization Error)',
        desc_ar: 'خصم درجتين (خطأ جلي في التشكيل أو الإعراب)',
        desc_en: 'Vocalization / Grammatical error (-2.0 pts)',
        amount: 2.0,
        isWarning: false,
        bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-400/30 text-purple-900',
        badgeColor: 'bg-purple-600 text-white',
        targetType: activeDeductionTypes.find(d => d.name_ar.includes('اللحن') || d.name_en.toLowerCase().includes('lahn') || (d.criteria_name === 'Memorization' && d.points_deducted === 2.0))
      },
      {
        key: 'tajweed',
        name_ar: 'التجويد وحسن الأداء',
        name_en: 'Tajweed & Performance',
        desc_ar: 'يخصم به نصف درجة (0.5) لكل خطأ تجويدي',
        desc_en: 'Tajweed / Voice error (-0.5 pt)',
        amount: 0.5,
        isWarning: false,
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/30 text-emerald-900',
        badgeColor: 'bg-emerald-700 text-white',
        targetType: activeDeductionTypes.find(d => d.name_ar.includes('تجويد') || d.name_en.toLowerCase().includes('tajweed') || d.points_deducted === 0.5)
      },
    ]
  }, [activeDeductionTypes])

  const sautType = useMemo(() => {
    return activeDeductionTypes.find(d => 
      d.criteria_name?.toLowerCase().includes('saut') || 
      d.name_en?.toLowerCase().includes('saut') || 
      d.name_ar?.includes('صوت')
    )
  }, [activeDeductionTypes])

  const tafsirType = useMemo(() => {
    return activeDeductionTypes.find(d => 
      d.criteria_name?.toLowerCase().includes('tafsir') || 
      d.name_en?.toLowerCase().includes('tafsir') || 
      d.name_ar?.includes('تفسير')
    )
  }, [activeDeductionTypes])

  const currentQBreakdown = myScore?.per_question?.find(q => q.question_number === selectedQuestion)
  const currentTanbeehCount = currentQBreakdown?.tanbeeh_count || 0
  const isRule5Triggered = currentTanbeehCount >= 3

  const handleApplyDeduction = async (typeId: number, amount: number) => {
    if (!activeStudentId || round.status !== 'ACTIVE' || isModerator) return
    try {
      setIsSubmitting(true)
      const res = await submitDeduction(token, {
        round_id: round.id,
        student_id: activeStudentId,
        deduction_type_id: typeId,
        question_number: selectedQuestion,
        amount: amount,
      })
      
      setRecentDeductions(prev => [{ id: res.id, question_number: selectedQuestion, deduction_type_id: typeId, amount }, ...prev])
      const updated = await getMyScore(token, round.id, activeStudentId)
      setMyScore(updated)
      
      const newQ = updated.per_question?.find(q => q.question_number === selectedQuestion)
      if (newQ && newQ.tanbeeh_count === 3) {
        toast.warning('⚠️ استنفد المتسابق 3 تنبيهات في هذا السؤال (قاعدة رقم 5). انتقل إلى السؤال التالي!', { duration: 6000 })
      } else {
        toast.success(`تم تسجيل الخصم (-${amount})`)
      }
    } catch (e: any) {
      toast.error(e.message || tc.error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApplyCustomDeduction = async (typeId: number, valStr: string, setter: (v: string) => void) => {
    const parsed = parseFloat(valStr)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('يرجى إدخال قيمة خصم صحيحة (مثال: 1.5) / Enter a valid deduction amount')
      return
    }
    await handleApplyDeduction(typeId, parsed)
    setter('')
  }

  const handleUndoDeduction = async (deductionTypeId?: number) => {
    if (!activeStudentId || recentDeductions.length === 0) return
    const targetIdx = deductionTypeId 
      ? recentDeductions.findIndex(d => d.question_number === selectedQuestion && d.deduction_type_id === deductionTypeId)
      : recentDeductions.findIndex(d => d.question_number === selectedQuestion)
    
    if (targetIdx === -1) {
      toast.error('لا توجد خصومات حديثة للتراجع عنها في هذا السؤال')
      return
    }

    const item = recentDeductions[targetIdx]
    try {
      setIsSubmitting(true)
      await deleteDeduction(token, item.id)
      setRecentDeductions(prev => prev.filter((_, idx) => idx !== targetIdx))
      toast.success('تم التراجع عن الخصم بنجاح / Deduction undone')
      const updated = await getMyScore(token, round.id, activeStudentId)
      setMyScore(updated)
    } catch (e: any) {
      toast.error(e.message || 'فشل التراجع')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveQuestionsDrawer = async () => {
    if (!activeStudentId) return
    try {
      setIsSubmitting(true)
      for (let q = 1; q <= totalQuestions; q++) {
        const item = drawerQuestions[q]
        if (item.surah_name || item.ayah_from || item.ayah_to || envelopeNumber) {
          await saveRoundQuestion(token, round.id, activeStudentId, {
            round_id: round.id,
            student_id: activeStudentId,
            question_number: q,
            envelope_number: envelopeNumber || null,
            surah_name: item.surah_name || null,
            ayah_from: item.ayah_from ? parseInt(item.ayah_from) : null,
            ayah_to: item.ayah_to ? parseInt(item.ayah_to) : null,
          })
        }
      }
      toast.success('تم حفظ بيانات الأسورة والظرف بنجاح')
      setShowEnvelopeDrawer(false)
      loadStudentData(activeStudentId)
    } catch (e: any) {
      toast.error(e.message || 'فشل حفظ الأسئلة')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenSheet = async () => {
    if (!activeStudentId) return
    try {
      const sheet = await getOfficialSheet(token, round.id, activeStudentId)
      setOfficialSheet(sheet)
      setShowSheetModal(true)
    } catch (e: any) {
      toast.error(e.message || 'فشل تحميل استمارة التقييم الرسمية')
    }
  }

  // Rubric Mode & Dynamic Limits
  const isTraditional = rubricMode === 'TRADITIONAL_TIERED'
  const maxHifdh = isTraditional ? (branchNumber === 30 ? 45.0 : 50.0) : 70.0
  const maxTajweed = isTraditional ? (branchNumber === 30 ? 25.0 : 30.0) : 30.0
  const maxTafsir = isTraditional && branchNumber === 30 ? 10.0 : 0.0
  const maxSaut = isTraditional ? 20.0 : 0.0

  // Running scores
  const hifdhScore = myScore ? myScore.hifdh_score : maxHifdh
  const tajweedScore = myScore ? myScore.tajweed_score : maxTajweed
  const sautScore = myScore?.saut_score ?? maxSaut
  const tafsirScore = myScore?.tafsir_score ?? maxTafsir
  const runningTotal = myScore ? myScore.total_score : 100.0


  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/dashboard/rounds`} className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-xs font-semibold">
          <ArrowLeft size={14} /> Back to Rounds
        </Link>
        <div className="flex items-center gap-3">
          {/* Rubric Mode Indicator / Quick Switcher */}
          <button
            type="button"
            onClick={async () => {
              const nextMode = isTraditional ? 'OFFICIAL_70_30' : 'TRADITIONAL_TIERED'
              setRubricMode(nextMode)
              const cfg = getCompetitionConfig()
              saveCompetitionConfig({ ...cfg, rubric_mode: nextMode })
              
              if (token) {
                try {
                  await setRubricModeApi(token, nextMode)
                  const res = await getRoundDeductionTypes(token, round.id)
                  if (res.deduction_types?.length) setActiveDeductionTypes(res.deduction_types)
                } catch (e) {
                  console.warn('Backend sync deferred:', e)
                }
              }
              if (activeStudentId) {
                loadStudentData(activeStudentId)
              }
              toast.success(
                nextMode === 'TRADITIONAL_TIERED'
                  ? (isAr ? 'تم التحويل إلى معيار الجمعية التقليدي (3 و 4 مستويات)' : 'Switched to Traditional JMC Rubric (3-Tier & 4-Tier)')
                  : (isAr ? 'تم التحويل إلى معيار 70 / 30 الرسمي (Saudi 2026)' : 'Switched to Official 70/30 Rubric (Saudi 2026)')
              )
            }}
            title={isAr ? 'اضغط للتبديل السريع بين المعيار الرسمي ومعيار الجمعية' : 'Click to toggle between Official 70/30 and Traditional JMC'}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border hidden sm:inline-flex items-center gap-1.5 cursor-pointer hover:shadow-xs transition-all active:scale-95 ${
              isTraditional 
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' 
                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Scale size={13} className={isTraditional ? 'text-[#c99335]' : 'text-[#006838]'} />
            <span>{isTraditional ? 'Traditional JMC (50/30/20 & 45/25/10/20)' : 'Official 70/30 Rubric (Saudi 2026)'}</span>
            <span className="text-[10px] font-bold underline opacity-75 ml-1">⇄ {isAr ? 'تبديل' : 'Switch'}</span>
          </button>

          {activeStudent && (
            <>
              <button
                onClick={() => setShowEnvelopeDrawer(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Mail size={13} className="text-amber-700" />
                <span>{envelopeNumber ? `${envelopeNumber}` : (isAr ? 'سحب الظرف وتحديد الأسئلة' : 'Envelope / Question Draw')}</span>
              </button>

              <button
                onClick={handleOpenSheet}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006838] hover:bg-[#004d29] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <FileText size={13} />
                <span>{isAr ? 'استمارة التقييم الرسمية 📄' : 'Official Rubric Sheet 📄'}</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={wsConnected ? 'text-emerald-700' : 'text-rose-700'}>
              {wsConnected ? dict.live.connected : dict.live.disconnected}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contestant Roster List */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs flex flex-col h-[calc(100vh-190px)]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/90 flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-sm text-gray-900">قائمة المتسابقين</h2>
              <p className="text-[11px] text-gray-500 font-sans">Contestants Roster</p>
            </div>
            {isModerator && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">Moderator</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {students.map(s => {
              const isLive = s.id === liveQueuedStudentId
              const isActive = activeStudentId === s.id
              const hasCompleted = !!results.find(r => r.student_id === s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStudentId(s.id)}
                  disabled={!isModerator && !isLive && round.status === 'ACTIVE'}
                  className={`w-full text-left p-3.5 transition-all ${isActive ? 'bg-amber-50/90 border-l-4 border-l-[#c99335]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'} ${!isModerator && !isLive && round.status === 'ACTIVE' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <p className={`font-semibold text-sm ${isActive ? 'text-amber-950 font-bold' : 'text-gray-800'}`}>
                    {s.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {isLive && (
                      <span className="text-[10px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> على المسرح LIVE
                      </span>
                    )}
                    {hasCompleted && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full block">✓ مكتمل</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Scoring Console */}
        <div className="lg:col-span-3">
          {activeStudent ? (
            <div className={`bg-white border ${isViewingLive ? 'border-[#c99335] shadow-lg shadow-amber-500/10' : 'border-gray-200 shadow-xs'} rounded-2xl p-6 min-h-[calc(100vh-190px)] flex flex-col transition-all duration-300`}>
              
              {/* Contestant Header Bar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="font-serif text-2xl font-bold text-gray-900 tracking-tight">
                      {activeStudent.full_name}
                    </h1>
                    {isViewingLive && (
                      <span className="text-xs font-sans font-bold text-white bg-rose-600 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        ON STAGE
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      الفرع: {branchNumber} جزءاً (Branch {branchNumber})
                    </span>
                    {envelopeNumber && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Mail size={12} /> {envelopeNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-1.5 font-medium flex items-center gap-3">
                    <span>المدرسة: {activeStudent.institution_name || 'مركز الأنوار'}</span>
                    <span>•</span>
                    <span>الجنسية: {activeStudent.nationality || 'كينية'}</span>
                    <span>•</span>
                    <span>الجولة #{round.id}</span>
                  </p>
                </div>

                {/* Live Running Total Gauge */}
                <div className="flex items-center gap-3 bg-gradient-to-br from-[#fcf9f2] to-amber-50/60 border border-amber-200/80 px-4 py-2.5 rounded-2xl shadow-2xs self-stretch md:self-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">الحفظ [{maxHifdh}]</p>
                    <p className="text-base font-bold font-serif text-gray-900">{hifdhScore.toFixed(1)}</p>
                  </div>
                  <div className="h-7 w-[1px] bg-amber-200" />
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">التجويد [{maxTajweed}]</p>
                    <p className="text-base font-bold font-serif text-gray-900">{tajweedScore.toFixed(1)}</p>
                  </div>
                  {maxTafsir > 0 && (
                    <>
                      <div className="h-7 w-[1px] bg-amber-200" />
                      <div className="text-right">
                        <p className="text-[10px] text-indigo-900 font-bold uppercase tracking-wider">التفسير [{maxTafsir}]</p>
                        <p className="text-base font-bold font-serif text-indigo-950">{tafsirScore.toFixed(1)}</p>
                      </div>
                    </>
                  )}
                  {maxSaut > 0 && (
                    <>
                      <div className="h-7 w-[1px] bg-amber-200" />
                      <div className="text-right">
                        <p className="text-[10px] text-blue-900 font-bold uppercase tracking-wider">الصوت [{maxSaut}]</p>
                        <p className="text-base font-bold font-serif text-blue-950">{sautScore.toFixed(1)}</p>
                      </div>
                    </>
                  )}
                  <div className="h-7 w-[1px] bg-amber-200" />
                  <div className="text-right">
                    <p className="text-[10px] text-amber-900 font-bold uppercase tracking-wider">المجموع النهائي</p>
                    <p className="text-2xl font-extrabold font-serif text-[#006838]">{runningTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>


              {/* Moderator "Push Live" Banner */}
              {isModerator && !isViewingLive && round.status === 'ACTIVE' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between my-5">
                  <div>
                    <h3 className="text-amber-900 font-bold text-sm">Line Up Contestant</h3>
                    <p className="text-amber-800 text-xs mt-0.5">Click to make this student live for all assigned judges.</p>
                  </div>
                  <button
                    onClick={handleSetLive}
                    disabled={isSubmitting}
                    className="btn-primary text-xs flex items-center gap-2 px-4 py-2 shadow-xs cursor-pointer"
                  >
                    <PlayCircle size={15} /> Set as Live Contestant
                  </button>
                </div>
              )}

              {/* Official Questions Tabs Bar */}
              <div className="mt-5 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isAr ? 'الأسئلة (مقدار كل سؤال: نصف صفحة)' : 'Questions (Portion: Half Page Each)'}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {totalQuestions} أسئلة ({questionAllotment} درجة لكل سؤال)
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => {
                    const qData = myScore?.per_question?.find(q => q.question_number === qNum)
                    const qMeta = questionsMeta[qNum]
                    const isSelected = selectedQuestion === qNum
                    const tanbeehCnt = qData?.tanbeeh_count || 0
                    const qScore = qData ? qData.question_score : questionAllotment
                    const isQRule5 = tanbeehCnt >= 3

                    return (
                      <button
                        key={qNum}
                        onClick={() => setSelectedQuestion(qNum)}
                        className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/90 border-[#c99335] shadow-xs ring-2 ring-amber-400/20'
                            : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold font-serif ${isSelected ? 'text-amber-950' : 'text-gray-800'}`}>
                            السؤال {qNum} {qNum === 1 ? 'الأول' : qNum === 2 ? 'الثاني' : qNum === 3 ? 'الثالث' : 'الرابع'}
                          </span>
                          <span className="text-[11px] font-bold font-serif text-[#006838]">
                            {qScore.toFixed(1)} / {questionAllotment}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-gray-600 truncate font-medium">
                          {qMeta?.surah_name ? `سورة ${qMeta.surah_name}` : (isAr ? 'لم تحدد السورة' : 'Surah not set')}
                        </p>

                        <div className="flex items-center gap-1.5 mt-2">
                          {tanbeehCnt > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isQRule5 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {tanbeehCnt}/3 تنبيه
                            </span>
                          )}
                          {(qData?.fath_count || 0) > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900">
                              {qData?.fath_count} فتح
                            </span>
                          )}
                          {(qData?.lahn_count || 0) > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">
                              {qData?.lahn_count} لحن
                            </span>
                          )}
                          {(qData?.tajweed_count || 0) > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                              {qData?.tajweed_count} تجويد
                            </span>
                          )}
                          {(qData?.tafsir_deductions || 0) > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900">
                              -{(qData?.tafsir_deductions || 0).toFixed(1)} تفسير
                            </span>
                          )}
                          {(qData?.saut_deductions || 0) > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">
                              -{(qData?.saut_deductions || 0).toFixed(1)} صوت
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rule #5 Official Alert Banner */}
              {isRule5Triggered && (
                <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-xl flex items-center justify-between my-4 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0 w-6 h-6" />
                    <div>
                      <h4 className="text-rose-950 font-bold text-sm">
                        ⚠️ تنبيه رسمي: استنفد المتسابق 3 تنبيهات في السؤال {selectedQuestion}
                      </h4>
                      <p className="text-rose-800 text-xs mt-0.5">
                        وفقاً للفقرة (5) من اللائحة: "إذا كان المتسابق قد نبه في السؤال الواحد ثلاث مرات ينتقل إلى السؤال الذي بعده".
                      </p>
                    </div>
                  </div>
                  {selectedQuestion < totalQuestions && (
                    <button
                      onClick={() => setSelectedQuestion(prev => prev + 1)}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      الانتقال للسؤال التالي ⏭️
                    </button>
                  )}
                </div>
              )}

              {/* Active Question Info Strip */}
              <div className="bg-gradient-to-r from-gray-50 to-amber-50/40 border border-gray-200 rounded-xl p-3.5 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#c99335] text-white flex items-center justify-center font-bold text-xs">
                    {selectedQuestion}
                  </span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      تقييم السؤال {selectedQuestion} من {totalQuestions}
                      {questionsMeta[selectedQuestion]?.surah_name && (
                        <span className="text-[#006838] font-serif mr-2"> — سورة {questionsMeta[selectedQuestion].surah_name} ({questionsMeta[selectedQuestion].ayah_from || 1} - {questionsMeta[selectedQuestion].ayah_to || '...'})</span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      درجة السؤال المستحقة: <span className="font-bold text-emerald-800">{currentQBreakdown ? currentQBreakdown.question_score.toFixed(1) : questionAllotment}</span> من {questionAllotment} درجة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUndoDeduction()}
                    disabled={recentDeductions.filter(d => d.question_number === selectedQuestion).length === 0 || isSubmitting}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
                  >
                    <Undo2 size={13} />
                    <span>تراجع عن آخر خصم (Undo)</span>
                  </button>
                  <button
                    onClick={() => setShowEnvelopeDrawer(true)}
                    className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline px-2 py-1"
                  >
                    تعديل السورة والآيات
                  </button>
                </div>
              </div>

              {/* Tactile Deduction Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {officialDeductionCards.map(card => {
                  const targetTypeId = card.targetType?.id || 0
                  const cardCount = currentQBreakdown 
                    ? card.key === 'tanbeeh' ? currentQBreakdown.tanbeeh_count
                    : card.key === 'fath' ? currentQBreakdown.fath_count
                    : card.key === 'lahn' ? currentQBreakdown.lahn_count
                    : currentQBreakdown.tajweed_count
                    : 0

                  const isTanbeehMaxed = card.key === 'tanbeeh' && cardCount >= 3

                  return (
                    <div
                      key={card.key}
                      className={`relative border rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between ${card.bgColor} ${
                        isTanbeehMaxed ? 'ring-2 ring-rose-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold font-serif text-base text-gray-900">{card.name_ar}</h4>
                            <span className="text-xs font-sans text-gray-500">({card.name_en})</span>
                          </div>
                          <p className="text-xs text-gray-700 mt-1 font-medium">{card.desc_ar}</p>
                        </div>
                        
                        {/* Live Count Counter */}
                        {cardCount > 0 && (
                          <span className={`w-8 h-8 rounded-full ${card.badgeColor} flex items-center justify-center font-bold text-sm shadow-xs`}>
                            {cardCount}
                          </span>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between gap-3">
                        <button
                          disabled={round.status !== 'ACTIVE' || isSubmitting || (!isModerator && !isViewingLive) || isModerator || isTanbeehMaxed}
                          onClick={() => handleApplyDeduction(targetTypeId, card.amount)}
                          className="flex-1 py-3 px-4 rounded-xl bg-white border border-gray-300 hover:border-amber-500 hover:bg-amber-50/70 font-bold text-sm text-gray-900 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <span className="text-rose-600 font-extrabold text-base">-{card.amount}</span>
                          <span>تسجيل خصم ({card.name_ar})</span>
                        </button>

                        {cardCount > 0 && (
                          <button
                            title="تراجع عن خصم واحد"
                            onClick={() => handleUndoDeduction(targetTypeId)}
                            disabled={isSubmitting}
                            className="p-3 rounded-xl bg-white/80 hover:bg-white border border-gray-300 text-gray-700 hover:text-rose-700 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Undo2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Traditional Tiered Controls: Sawt & Tafsir */}
              {isTraditional && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-auto">
                  {/* Sawt Card */}
                  {maxSaut > 0 && (
                    <div className="border border-blue-200/90 rounded-2xl p-5 bg-gradient-to-br from-blue-50/50 to-sky-50/30 text-blue-950 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold font-serif text-base text-gray-900">حسن الصوت والأداء</h4>
                            <span className="text-xs font-sans text-gray-500">(Sawt / Voice)</span>
                          </div>
                          <p className="text-xs text-blue-900 mt-1 font-medium">
                            المخصص: 20 درجة • خصم على جمال الصوت والوقف والابتداء
                          </p>
                        </div>

                        {(currentQBreakdown?.saut_deductions || 0) > 0 && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-xs shadow-xs">
                            -{(currentQBreakdown?.saut_deductions || 0).toFixed(1)} خصم
                          </span>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-blue-200/60 space-y-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-gray-600">خصم سريع:</span>
                          {[0.5, 1.0, 2.0, 3.0].map(amt => (
                            <button
                              key={amt}
                              disabled={round.status !== 'ACTIVE' || isSubmitting || isModerator || (!isModerator && !isViewingLive)}
                              onClick={() => sautType && handleApplyDeduction(sautType.id, amt)}
                              className="px-2.5 py-1.5 bg-white border border-blue-300 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold text-blue-900 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              -{amt}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.5"
                            placeholder="قيمة الخصم (مثال: 1.5)"
                            value={customSautDeduct}
                            onChange={e => setCustomSautDeduct(e.target.value)}
                            disabled={round.status !== 'ACTIVE' || isSubmitting || isModerator}
                            className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono"
                          />
                          <button
                            disabled={round.status !== 'ACTIVE' || isSubmitting || isModerator || !customSautDeduct}
                            onClick={() => sautType && handleApplyCustomDeduction(sautType.id, customSautDeduct, setCustomSautDeduct)}
                            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                          >
                            خصم
                          </button>
                          {(currentQBreakdown?.saut_deductions || 0) > 0 && sautType && (
                            <button
                              title="تراجع عن خصم الصوت"
                              onClick={() => handleUndoDeduction(sautType.id)}
                              disabled={isSubmitting}
                              className="p-1.5 bg-white border border-blue-300 hover:bg-rose-50 text-gray-700 hover:text-rose-700 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              <Undo2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tafsir Card (Only for 30 Juz) */}
                  {maxTafsir > 0 && (
                    <div className="border border-indigo-200/90 rounded-2xl p-5 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 text-indigo-950 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold font-serif text-base text-gray-900">التفسير</h4>
                            <span className="text-xs font-sans text-gray-500">(Tafsir)</span>
                          </div>
                          <p className="text-xs text-indigo-900 mt-1 font-medium">
                            المخصص: 10 درجات • "Tafsir deduction based on Judge"
                          </p>
                        </div>

                        {(currentQBreakdown?.tafsir_deductions || 0) > 0 && (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
                            -{(currentQBreakdown?.tafsir_deductions || 0).toFixed(1)} خصم
                          </span>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-indigo-200/60 space-y-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-gray-600">خصم سريع:</span>
                          {[1.0, 2.0, 3.0, 5.0].map(amt => (
                            <button
                              key={amt}
                              disabled={round.status !== 'ACTIVE' || isSubmitting || isModerator || (!isModerator && !isViewingLive)}
                              onClick={() => tafsirType && handleApplyDeduction(tafsirType.id, amt)}
                              className="px-2.5 py-1.5 bg-white border border-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold text-indigo-900 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              -{amt}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.5"
                            placeholder="خصم التفسير (مثال: 2.0)"
                            value={customTafsirDeduct}
                            onChange={e => setCustomTafsirDeduct(e.target.value)}
                            disabled={round.status !== 'ACTIVE' || isSubmitting || isModerator}
                            className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-mono"
                          />
                          <button
                            disabled={round.status !== 'ACTIVE' || isSubmitting || isModerator || !customTafsirDeduct}
                            onClick={() => tafsirType && handleApplyCustomDeduction(tafsirType.id, customTafsirDeduct, setCustomTafsirDeduct)}
                            className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                          >
                            خصم
                          </button>
                          {(currentQBreakdown?.tafsir_deductions || 0) > 0 && tafsirType && (
                            <button
                              title="تراجع عن خصم التفسير"
                              onClick={() => handleUndoDeduction(tafsirType.id)}
                              disabled={isSubmitting}
                              className="p-1.5 bg-white border border-indigo-300 hover:bg-rose-50 text-gray-700 hover:text-rose-700 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              <Undo2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {isModerator && (
                <p className="text-xs text-gray-400 text-center mt-6 font-medium">
                  حساب المشرف: للاطلاع وإدارة الجلسة فقط — المحكمون المعتمدون هم من يرصدون الدرجات.
                </p>
              )}

              {/* Bottom Status & Refresh */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">
                <div>
                  {currentResult ? (
                    <div className="text-emerald-700 font-semibold text-sm flex items-center gap-1.5">
                      <CheckCircle size={16} /> نتيجة اللجنة المعتمدة: {currentResult.final_score.toFixed(2)}
                    </div>
                  ) : myScore?.all_judges_submitted ? (
                    <div className="text-emerald-700 font-semibold text-sm flex items-center gap-1.5">
                      <CheckCircle size={16} /> {t.scoring_submitted}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      {t.panel_score_pending}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => activeStudentId && loadStudentData(activeStudentId)}
                    className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
                  >
                    <RefreshCcw size={13} /> تحديث الدرجات
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 min-h-[calc(100vh-190px)] flex flex-col items-center justify-center text-center">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse mb-4 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              <h3 className="text-gray-900 font-bold text-lg mb-1">في انتظار المتسابق التالي</h3>
              <p className="text-gray-500 text-sm max-w-sm">سيقوم المشرف باختيار المتسابق القادم ودفع الشاشة تلقائياً لكافة المحكمين.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* Envelope & Question Drawer Modal */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {showEnvelopeDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Mail className="text-[#c99335] w-5 h-5" />
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  {isAr ? 'سحب الظرف وتحديد أسئلة المتسابق' : 'Question Envelope & Surah Draw'}
                </h3>
              </div>
              <button onClick={() => setShowEnvelopeDrawer(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {isAr ? 'رقم الظرف المسحوب (Envelope #)' : 'Drawn Envelope Number'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: الظرف رقم 14 / Envelope #14"
                  value={envelopeNumber}
                  onChange={e => setEnvelopeNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {isAr ? 'يسحب المتسابق مظروفاً مغلقاً يحتوي على مجموعة الأسئلة المحددة له.' : 'The student draws a sealed envelope with their questions.'}
                </p>
              </div>

              {/* Per-Question Surah & Ayah Input */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  {isAr ? 'بيانات أسئلة التلاوة (سورة والآيات)' : 'Question Passages'}
                </h4>

                {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => {
                  const val = drawerQuestions[qNum]
                  return (
                    <div key={qNum} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-950 font-serif">
                          السؤال {qNum} (Question {qNum})
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">مقدار السؤال: نصف صفحة</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] text-gray-500 mb-1">السورة (Surah)</label>
                          <input
                            type="text"
                            list={`surahs-list-${qNum}`}
                            placeholder="اختر أو اكتب السورة"
                            value={val.surah_name}
                            onChange={e => setDrawerQuestions(prev => ({
                              ...prev,
                              [qNum]: { ...prev[qNum], surah_name: e.target.value }
                            }))}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                          <datalist id={`surahs-list-${qNum}`}>
                            {QURAN_SURAHS.map(s => (
                              <option key={s.number} value={s.name_ar}>
                                {s.number}. {s.name_ar} ({s.name_en} - {s.ayah_count} آية)
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">الآية من (Ayah From)</label>
                          <input
                            type="number"
                            placeholder="1"
                            value={val.ayah_from}
                            onChange={e => setDrawerQuestions(prev => ({
                              ...prev,
                              [qNum]: { ...prev[qNum], ayah_from: e.target.value }
                            }))}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">إلى (Ayah To)</label>
                          <input
                            type="number"
                            placeholder="25"
                            value={val.ayah_to}
                            onChange={e => setDrawerQuestions(prev => ({
                              ...prev,
                              [qNum]: { ...prev[qNum], ayah_to: e.target.value }
                            }))}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowEnvelopeDrawer(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveQuestionsDrawer}
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#006838] hover:bg-[#004d29] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                حفظ بيانات الأسئلة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* Official Printable Evaluation Sheet Modal (استمارة اختبار التصفية الأولية) */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {showSheetModal && officialSheet && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-white text-black max-w-4xl w-full rounded-2xl shadow-2xl p-6 sm:p-10 my-auto overflow-y-auto max-h-[95vh] print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full">
            
            {/* Modal Actions (Hidden when printing) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="text-[#006838] w-5 h-5" />
                <h3 className="font-bold text-sm text-gray-900">معاينة الاستمارة الرسمية للاختبار</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#006838] hover:bg-[#004d29] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer size={15} /> طباعة الاستمارة (Print Form)
                </button>
                <button
                  onClick={() => setShowSheetModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Official Sheet Printable Body */}
            <div id="official-evaluation-sheet" dir="rtl" className="font-sans border border-gray-400 p-6 sm:p-8 bg-white text-black print:border-none print:p-0">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                <div className="text-right text-xs leading-relaxed font-bold">
                  <p className="text-sm">المملكة العربية السعودية</p>
                  <p>وزارة الشؤون الإسلامية والدعوة والإرشاد</p>
                  <p>وكالة الوزارة للشؤون الإسلامية</p>
                  <p>الملحقية الثقافية بسفارة المملكة العربية السعودية في كينيا</p>
                  <p className="text-[#006838] font-serif text-sm mt-1">مسابقة القرآن الكريم في كينيا لعام 2026م</p>
                </div>

                <div className="text-center my-auto">
                  <div className="w-16 h-16 mx-auto mb-1 border border-gray-300 rounded-full flex items-center justify-center bg-gray-50">
                    <BookOpen size={28} className="text-[#006838]" />
                  </div>
                  <h2 className="text-base font-bold font-serif underline decoration-1 underline-offset-4">
                    استمارة اختبار التصفية الأولية
                  </h2>
                  <p className="text-xs mt-1 font-semibold">مقر المسابقة: مسجد الجامع نيروبي</p>
                </div>

                <div className="text-left text-xs space-y-1">
                  <p><span className="font-bold">التاريخ:</span> {officialSheet.date_str}م</p>
                </div>
              </div>

              {/* Contestant Details Strip */}
              <div className="border border-black p-3 mb-4 text-xs leading-relaxed">
                <div className="grid grid-cols-2 gap-y-2">
                  <p><span className="font-bold">اسم المتسابق:</span> {officialSheet.student_name}</p>
                  <p><span className="font-bold">الجنسية:</span> {officialSheet.nationality}</p>
                  <p><span className="font-bold">عمر المتسابق:</span> {officialSheet.age ? `${officialSheet.age} سنة` : '17 سنة'}</p>
                  <p><span className="font-bold">اسم المدرسة التي يمثلها:</span> {officialSheet.institution_name}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-dashed border-gray-400 flex items-center gap-4">
                  <span className="font-bold">الفرع:</span>
                  <div className="flex items-center gap-4">
                    {[30, 20, 10, 5].map(b => (
                      <div key={b} className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs ${
                          officialSheet.branch_number === b ? 'bg-black text-white' : 'bg-white'
                        }`}>
                          {officialSheet.branch_number === b ? '✓' : ''}
                        </span>
                        <span className="font-bold">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Official Rubric Table */}
              <table className="w-full border-collapse border border-black text-xs text-center mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th rowSpan={2} className="border border-black p-2 w-12">الأسئلة</th>
                    <th rowSpan={2} className="border border-black p-2 w-28">السورة</th>
                    <th rowSpan={2} className="border border-black p-2 w-28">الآية من ... إلى</th>
                    <th colSpan={3} className="border border-black p-2">
                      الحفظ [ {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' ? (officialSheet.max_hifdh || 50) : 70} درجة ]
                    </th>
                    <th rowSpan={2} className="border border-black p-2 w-28">
                      {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' ? (
                        <>التجويد [ {officialSheet.max_tajweed || 30} درجة ]<br/><span className="text-[10px] font-normal">يخصم به (0.5)</span></>
                      ) : (
                        <>التجويد وحسن الصوت والأداء [ 30 درجة ]<br/><span className="text-[10px] font-normal">يخصم به (0.5)</span></>
                      )}
                    </th>
                    {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_tafsir || 0) > 0 && (
                      <th rowSpan={2} className="border border-black p-2 w-24">
                        التفسير [ {officialSheet.max_tafsir} درجات ]<br/>
                        <span className="text-[10px] font-normal">تقدير المحكّم</span>
                      </th>
                    )}
                    {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_saut || 0) > 0 && (
                      <th rowSpan={2} className="border border-black p-2 w-24">
                        الصوت والأداء [ {officialSheet.max_saut} درجة ]
                      </th>
                    )}
                    <th rowSpan={2} className="border border-black p-2 w-20">الدرجة</th>
                  </tr>
                  <tr className="bg-gray-50 text-[11px]">
                    <th className="border border-black p-1 w-18">الفتح<br/><span className="font-normal text-[9px]">خصم درجتين</span></th>
                    <th className="border border-black p-1 w-18">تنبيه<br/><span className="font-normal text-[9px]">خصم درجة</span></th>
                    <th className="border border-black p-1 w-18">اللحن<br/><span className="font-normal text-[9px]">خصم درجتين</span></th>
                  </tr>
                </thead>
                <tbody>
                  {officialSheet.questions.map((q) => (
                    <tr key={q.question_number} className="h-10">
                      <td className="border border-black font-bold">{q.question_number}</td>
                      <td className="border border-black">{q.surah_name || '—'}</td>
                      <td className="border border-black">
                        {q.ayah_from ? `${q.ayah_from} - ${q.ayah_to || '...'}` : '—'}
                      </td>
                      <td className="border border-black font-semibold text-rose-700">
                        {q.fath_count > 0 ? `-${(q.fath_count * 2.0).toFixed(1)} (${q.fath_count})` : '—'}
                      </td>
                      <td className="border border-black font-semibold text-amber-700">
                        {q.tanbeeh_count > 0 ? `-${(q.tanbeeh_count * 1.0).toFixed(1)} (${q.tanbeeh_count})` : '—'}
                      </td>
                      <td className="border border-black font-semibold text-purple-700">
                        {q.lahn_count > 0 ? `-${(q.lahn_count * 2.0).toFixed(1)} (${q.lahn_count})` : '—'}
                      </td>
                      <td className="border border-black font-semibold text-emerald-800">
                        {q.tajweed_count > 0 ? `-${(q.tajweed_count * 0.5).toFixed(1)} (${q.tajweed_count})` : '—'}
                      </td>
                      {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_tafsir || 0) > 0 && (
                        <td className="border border-black font-semibold text-indigo-800">
                          {(q.tafsir_deductions || 0) > 0 ? `-${(q.tafsir_deductions || 0).toFixed(1)}` : '—'}
                        </td>
                      )}
                      {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_saut || 0) > 0 && (
                        <td className="border border-black font-semibold text-blue-800">
                          {(q.saut_deductions || 0) > 0 ? `-${(q.saut_deductions || 0).toFixed(1)}` : '—'}
                        </td>
                      )}
                      <td className="border border-black font-bold text-sm bg-gray-50/50">
                        {q.question_score.toFixed(1)}
                      </td>
                    </tr>
                  ))}

                  {/* Empty rows if questions < 4 to preserve exact official paper height */}
                  {Array.from({ length: Math.max(0, 4 - officialSheet.questions.length) }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="h-10 opacity-30">
                      <td className="border border-black">{officialSheet.questions.length + idx + 1}</td>
                      <td className="border border-black">—</td>
                      <td className="border border-black">—</td>
                      <td className="border border-black">—</td>
                      <td className="border border-black">—</td>
                      <td className="border border-black">—</td>
                      <td className="border border-black">—</td>
                      {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_tafsir || 0) > 0 && (
                        <td className="border border-black">—</td>
                      )}
                      {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_saut || 0) > 0 && (
                        <td className="border border-black">—</td>
                      )}
                      <td className="border border-black">—</td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={3} className="border border-black p-2 text-center text-sm">المجموع</td>
                    <td colSpan={3} className="border border-black p-2 text-rose-800">
                      إجمالي خصم الحفظ: -{officialSheet.total_hifdh_deduction.toFixed(1)}
                    </td>
                    <td className="border border-black p-2 text-emerald-800">
                      خصم التجويد: -{officialSheet.total_tajweed_deduction.toFixed(1)}
                    </td>
                    {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_tafsir || 0) > 0 && (
                      <td className="border border-black p-2 text-indigo-800">
                        خصم التفسير: -{(officialSheet.total_tafsir_deduction || 0).toFixed(1)}
                      </td>
                    )}
                    {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_saut || 0) > 0 && (
                      <td className="border border-black p-2 text-blue-800">
                        خصم الصوت: -{(officialSheet.total_saut_deduction || 0).toFixed(1)}
                      </td>
                    )}
                    <td className="border border-black p-2 text-base font-extrabold text-[#006838]">
                      {officialSheet.final_score.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Summary Grade Line */}
              <div className="flex flex-wrap justify-between items-center bg-gray-50 border border-black p-3 mb-4 text-xs font-bold gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>درجة الحفظ: <span className="text-[#006838] text-sm">{officialSheet.final_hifdh_score.toFixed(1)}</span> / {officialSheet.max_hifdh || 70}</span>
                  <span>|</span>
                  <span>درجة التجويد: <span className="text-[#006838] text-sm">{officialSheet.final_tajweed_score.toFixed(1)}</span> / {officialSheet.max_tajweed || 30}</span>
                  {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_tafsir || 0) > 0 && (
                    <>
                      <span>|</span>
                      <span>درجة التفسير: <span className="text-[#006838] text-sm">{(officialSheet.final_tafsir_score || 0).toFixed(1)}</span> / {officialSheet.max_tafsir}</span>
                    </>
                  )}
                  {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' && (officialSheet.max_saut || 0) > 0 && (
                    <>
                      <span>|</span>
                      <span>درجة الصوت والأداء: <span className="text-[#006838] text-sm">{(officialSheet.final_saut_score || 0).toFixed(1)}</span> / {officialSheet.max_saut}</span>
                    </>
                  )}
                </div>
                <div className="text-sm">
                  الدرجة النهائية المستحقة: <span className="text-base text-[#006838] font-extrabold underline">{officialSheet.final_score.toFixed(2)}</span> / 100
                </div>
              </div>

              {/* Judge Signature Block */}
              <div className="flex justify-between items-center text-xs pt-2 mb-4">
                <p><span className="font-bold">اسم المحكّم:</span> {officialSheet.judge_name || '................................................'}</p>
                <p><span className="font-bold">التوقيع:</span> ................................................</p>
              </div>

              {/* Official Instructions Block */}
              <div className="border-t-2 border-black pt-3 text-[11px] leading-relaxed text-gray-800">
                <h4 className="font-bold text-black mb-1.5 underline">تعليمات وإرشادات مهمة:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>يسأل المتسابق أربعة أسئلة للفرع الأول والثاني، وثلاثة أسئلة للفرع الثالث والرابع. ومقدار السؤال في كل فرع نصف صفحة.</li>
                  {officialSheet.rubric_mode === 'TRADITIONAL_TIERED' ? (
                    officialSheet.branch_number === 30 ? (
                      <li>توزيع درجات الفرع الأول (حفظ كامل): الحفظ 45 درجة، التجويد 25 درجة، التفسير 10 درجات، وحسن الصوت والأداء 20 درجة (المجموع 100).</li>
                    ) : (
                      <li>توزيع درجات الفروع (5، 10، 15، 20 جزءاً): الحفظ 50 درجة، التجويد 30 درجة، وحسن الصوت والأداء 20 درجة (المجموع 100).</li>
                    )
                  ) : (
                    <li>يعطى المتسابق على الحفظ 70 درجة، وعلى التجويد وحسن الأداء 30 درجة.</li>
                  )}
                  <li>طريقة احتساب الأخطاء في الحفظ: (التنبيه: يعني خصم درجة | الفتح: يعني خصم درجتين | اللحن: يعني خصم درجتين).</li>
                  <li>الخطأ في التجويد: يخصم به نصف درجة (0.5).</li>
                  <li><span className="font-bold">إذا كان المتسابق قد نبه في السؤال الواحد ثلاث مرات ينتقل إلى السؤال الذي بعده.</span></li>
                  <li>تحتسب درجة المتسابق في السؤال الواحد بخصم درجات الخطأ من مجموع درجات السؤال، والناتج هو محصل درجاته من السؤال.</li>
                  <li>عند أي استشكال أو استفسار يرجى الاتصال بلجنة التنسيق على الرقم <span className="font-bold font-sans">0720680142</span>.</li>
                </ol>
              </div>


            </div>
          </div>
        </div>
      )}

    </div>
  )
}
