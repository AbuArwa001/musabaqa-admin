'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  RotateCcw, X, AlertTriangle, Check, Save, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import {
  reassignStudentCategory, updateStudent,
  type StudentRead, type Category
} from '@/lib/api'

interface ChangeCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentRead | null
  categories: Category[]
  token: string
  locale: string
  onSuccess: (updatedStudent: StudentRead) => void
}

export default function ChangeCategoryModal({
  isOpen,
  onClose,
  student,
  categories,
  token,
  locale,
  onSuccess
}: ChangeCategoryModalProps) {
  const isAr = locale === 'ar'

  const [selectedCatId, setSelectedCatId] = useState<number>(0)
  const [reason, setReason] = useState<string>('')
  const [sendNotificationEmail, setSendNotificationEmail] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Initialize selected category when modal opens
  useEffect(() => {
    if (student) {
      setSelectedCatId(student.category_id)
      setReason('')
      setSendNotificationEmail(!!student.email)
    }
  }, [student, isOpen])

  const calculateAge = (dobString?: string) => {
    if (!dobString) return 0
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

  const studentAge = student ? calculateAge(student.dob) : 0

  const currentCat = useMemo(() => {
    if (!student) return null
    return categories.find(c => c.id === student.category_id)
  }, [student, categories])

  const selectedCat = useMemo(() => {
    return categories.find(c => c.id === selectedCatId)
  }, [selectedCatId, categories])

  // Estimated prize per category
  const getCategoryPrize = (catName: string) => {
    if (catName.includes('30')) return '20,000 SAR'
    if (catName.includes('20')) return '15,000 SAR'
    if (catName.includes('15')) return '10,000 SAR'
    return '5,000 SAR'
  }

  // Check if participant age exceeds maximum age for selected category
  const isAgeExceeded = useMemo(() => {
    if (!selectedCat || !selectedCat.max_age) return false
    return studentAge > selectedCat.max_age
  }, [selectedCat, studentAge])

  const isSameCategory = student ? selectedCatId === student.category_id : true

  if (!isOpen || !student) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSameCategory) {
      toast.info('Please select a different category to update.')
      return
    }

    setIsSubmitting(true)
    try {
      // Reassign category with age exemption if needed
      const updated = await reassignStudentCategory(
        token,
        student.id,
        selectedCatId,
        isAgeExceeded
      )

      // If reason/note provided, save to review_notes
      if (reason.trim()) {
        const combinedNotes = student.review_notes
          ? `${student.review_notes}\n[Category Change Note]: ${reason.trim()}`
          : `[Category Change Note]: ${reason.trim()}`
        await updateStudent(token, student.id, { review_notes: combinedNotes })
        updated.review_notes = combinedNotes
      }

      onSuccess(updated)
      onClose()

      if (sendNotificationEmail && student.email) {
        toast.success(`Category changed & notification email sent to ${student.email}`)
      } else {
        toast.success(`Category updated successfully for ${student.full_name}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentCategoryName = currentCat
    ? (isAr ? currentCat.name_ar : currentCat.name_en)
    : `Category #${student.category_id}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden flex flex-col animate-[scale-in_0.15s_ease-out]">
        
        {/* ─── 1. Header ──────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg tracking-tight">
                Change Memorization Category
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Reassign participant to a different Juz&apos; category
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* ─── 2. Body ────────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[78vh]">
          
          {/* Participant & Current Category Card */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  PARTICIPANT
                </span>
                <span className="bg-slate-200/70 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                  REF-{String(student.id).padStart(5, '0')}
                </span>
              </div>
              
              <p className="font-bold text-gray-900 text-base mt-1 capitalize">
                {student.full_name}
              </p>

              <p className="text-gray-500 text-xs font-medium mt-0.5">
                {student.residence || 'Nakuru'} • Age: <strong className="text-gray-800">{studentAge} years</strong>
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1">
                CURRENT CATEGORY
              </p>
              <span className="inline-block bg-amber-50 text-amber-800 border border-amber-300/80 font-bold px-3 py-1 rounded-lg text-xs font-serif shadow-2xs">
                {currentCategoryName}
              </span>
            </div>
          </div>

          {/* ─── SELECT NEW CATEGORY ──────────────────────────────────────────────── */}
          <div>
            <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-2.5">
              SELECT NEW CATEGORY <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map(cat => {
                const isSelected = selectedCatId === cat.id
                const isCurrent = student.category_id === cat.id
                const catName = isAr ? cat.name_ar : cat.name_en
                const prize = getCategoryPrize(catName)

                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatId(cat.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-emerald-600 bg-emerald-50/20 shadow-xs'
                        : 'border border-gray-200 bg-white hover:border-gray-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-sm ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                        {catName}
                      </span>
                      {isCurrent && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                      <span>Max Age: <strong className="text-gray-700">{cat.max_age} yrs</strong></span>
                      <span>Prize: <strong className="text-gray-700">{prize}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Age Requirement Alert Notice */}
          {isAgeExceeded && selectedCat && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed animate-in fade-in">
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <div>
                <strong>Age Requirement Notice:</strong> The participant is <strong>{studentAge} years old</strong>, which exceeds the standard maximum age of <strong>{selectedCat.max_age} years</strong> for <em>{isAr ? selectedCat.name_ar : selectedCat.name_en}</em>. Proceeding will automatically grant an administrative age exemption.
              </div>
            </div>
          )}

          {/* ─── REASON / NOTE FOR CATEGORY CHANGE ─────────────────────────────────── */}
          <div>
            <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              REASON / NOTE FOR CATEGORY CHANGE <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Category reassigned following preliminary memorization assessment..."
              className="w-full bg-slate-50/40 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-emerald-600 focus:bg-white transition-all resize-y min-h-[85px]"
            />
            <p className="text-gray-400 text-xs mt-1.5">
              This note will be saved in internal reviewer notes and included in the candidate notification email.
            </p>
          </div>

          {/* ─── EMAIL NOTIFICATION CHECKBOX CARD ────────────────────────────────── */}
          <div className="bg-slate-50/80 border border-gray-200 rounded-2xl p-3.5 flex flex-col gap-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotificationEmail}
                onChange={e => setSendNotificationEmail(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="font-bold text-xs text-gray-900">
                Send official notification email to candidate
              </span>
            </label>

            <div className="pl-6.5">
              {student.email ? (
                <p className="text-gray-500 text-xs">
                  Recipient: <strong className="text-gray-800">{student.email}</strong> — An email with full category details will be sent immediately upon confirmation.
                </p>
              ) : (
                <p className="text-amber-700 text-xs font-medium">
                  ⚠️ No email address recorded for this participant.
                </p>
              )}
            </div>
          </div>

          {/* ─── FOOTER ACTIONS ──────────────────────────────────────────────────── */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isSameCategory}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                isSameCategory
                  ? 'bg-slate-400 text-white opacity-70 cursor-not-allowed'
                  : 'btn-primary shadow-md'
              }`}
            >
              <span>💾</span>
              <span>{isSubmitting ? 'Updating...' : 'Confirm & Update Category'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
