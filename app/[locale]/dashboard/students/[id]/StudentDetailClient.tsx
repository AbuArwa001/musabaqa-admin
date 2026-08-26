'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Edit3, Download, Printer, Trash2, Tag, Check, X, FileText, UserCheck, Phone, Mail, MapPin, Building2, Calendar, Shield } from 'lucide-react'
import { toast } from 'sonner'
import {
  approveStudent, rejectStudent, updateStudent, reassignStudentCategory, softDeleteStudent,
  type StudentRead, type InstitutionRead, type Category
} from '@/lib/api'
import Modal from '@/components/Modal'

export default function StudentDetailClient({
  initialStudent, institution, categories, locale, token
}: {
  initialStudent: StudentRead
  institution: InstitutionRead | null
  categories: Category[]
  locale: string
  token: string
}) {
  const [student, setStudent] = useState<StudentRead>(initialStudent)
  const isAr = locale === 'ar'

  // Modals state
  const [showEdit, setShowEdit] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  // Form states
  const [editName, setEditName] = useState(student.full_name)
  const [editDob, setEditDob] = useState(student.dob)
  const [editGender, setEditGender] = useState(student.gender)
  const [editNationalId, setEditNationalId] = useState(student.national_id)
  const [editGuardianPhone, setEditGuardianPhone] = useState(student.guardian_phone)
  const [editAltPhone, setEditAltPhone] = useState(student.alternative_phone || '')
  const [editEmail, setEditEmail] = useState(student.email || '')
  const [editResidence, setEditResidence] = useState(student.residence || 'Nairobi')
  const [editNationality, setEditNationality] = useState(student.nationality || 'Kenyan')

  const [selectedCatId, setSelectedCatId] = useState<number>(student.category_id)
  const [ageExemption, setAgeExemption] = useState(false)

  const [rejectionReason, setRejectionReason] = useState('')
  const [deletionReason, setDeletionReason] = useState('')
  const [internalNotes, setInternalNotes] = useState(student.review_notes || '')

  const currentCat = categories.find(c => c.id === student.category_id)

  const calculateAge = (dobString: string) => {
    if (!dobString) return { age: 0, formattedDob: '—' }
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    const formattedDob = birthDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    return { age, formattedDob }
  }

  const { age, formattedDob } = calculateAge(student.dob)

  const handleApprove = async () => {
    try {
      const updated = await approveStudent(token, student.id)
      setStudent(updated)
      toast.success('Candidate registration approved successfully!')
    } catch (e: any) { toast.error(e.message || 'Failed to approve student') }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.')
      return
    }
    try {
      const updated = await rejectStudent(token, student.id, rejectionReason)
      setStudent(updated)
      setShowRejectModal(false)
      toast.success('Candidate registration marked as rejected.')
    } catch (e: any) { toast.error(e.message || 'Failed to reject student') }
  }

  const handleSaveProfile = async () => {
    try {
      const updated = await updateStudent(token, student.id, {
        full_name: editName,
        dob: editDob,
        gender: editGender,
        national_id: editNationalId,
        guardian_phone: editGuardianPhone,
        alternative_phone: editAltPhone,
        email: editEmail,
        residence: editResidence,
        nationality: editNationality,
      })
      setStudent(updated)
      setShowEdit(false)
      toast.success('Student profile updated successfully.')
    } catch (e: any) { toast.error(e.message || 'Failed to update student profile') }
  }

  const handleReassignCategory = async () => {
    try {
      const updated = await reassignStudentCategory(token, student.id, selectedCatId, ageExemption)
      setStudent(updated)
      setShowCategoryModal(false)
      toast.success('Category reassigned successfully.')
    } catch (e: any) { toast.error(e.message || 'Failed to reassign category') }
  }

  const handleDelete = async () => {
    if (!deletionReason.trim()) {
      toast.error('Please provide an archival / deletion reason.')
      return
    }
    try {
      await softDeleteStudent(token, student.id, deletionReason)
      toast.success('Candidate moved to Archive.')
      window.location.href = `/${locale}/dashboard/students`
    } catch (e: any) { toast.error(e.message || 'Failed to archive student') }
  }

  const handleSaveNotes = async () => {
    try {
      await updateStudent(token, student.id, { review_notes: internalNotes })
      toast.success('Private review notes saved.')
    } catch (e: any) { toast.error(e.message || 'Failed to save notes') }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/${locale}/dashboard/students`}
          className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-xs font-semibold"
        >
          <ArrowLeft size={15} /> Back to Registry
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Tag size={13} className="text-[#c99335]" /> Change Category
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Edit3 size={13} className="text-emerald-700" /> Edit Profile
          </button>
          <button
            onClick={() => toast.success(`Downloading official dossier PDF for ${student.full_name}...`)}
            className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Download size={13} /> Download Official PDF
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Printer size={13} /> Print View
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={13} /> Delete / Archive
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-[#004d29] text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-[#006838]">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Image src="/logo.png" alt="Jamia Mosque" width={38} height={38} className="object-contain" />
            </div>
            <div>
              <p className="text-[#c99335] text-xs uppercase font-bold tracking-widest font-serif">
                Jamia Mosque Committee · Musabaqa 2026
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mt-1">
                {student.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100/80 mt-2">
                <span className="font-mono bg-white/10 px-2.5 py-0.5 rounded text-white font-semibold">
                  ID: REF-000{student.id}
                </span>
                <span>•</span>
                <span className="bg-[#c99335]/20 text-[#f6cb7d] px-2.5 py-0.5 rounded font-semibold border border-[#c99335]/40 flex items-center gap-1">
                  Category: {currentCat ? (isAr ? currentCat.name_ar : currentCat.name_en) : '—'}
                </span>
                <span>•</span>
                <span>Submitted: {new Date(student.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span className={
              student.review_status === 'APPROVED' ? 'bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5' :
              student.review_status === 'REJECTED' ? 'bg-rose-500 text-white font-bold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5' :
              'bg-amber-500 text-white font-bold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5'
            }>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {student.review_status === 'PENDING_REVIEW' ? 'PENDING' : student.review_status}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <UserCheck size={16} className="text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                Personal Information
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pt-5">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">DATE OF BIRTH</p>
                <p className="font-semibold text-gray-900 text-sm mt-1">{formattedDob}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">AGE</p>
                <p className="font-semibold text-gray-900 text-sm mt-1">{age} years old</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">NATIONALITY</p>
                <p className="font-semibold text-gray-900 text-sm mt-1">{student.nationality || 'Kenyan'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">NATIONAL ID / PASSPORT</p>
                <p className="font-semibold text-gray-900 font-mono text-sm mt-1">{student.national_id}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">CURRENT RESIDENCE</p>
                <p className="font-semibold text-gray-900 text-sm mt-1">{student.residence || 'Nairobi'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">GENDER</p>
                <p className="font-semibold text-gray-900 text-sm mt-1">{student.gender}</p>
              </div>
            </div>
          </div>

          {/* Contact & Institutional Data */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <Phone size={16} className="text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                Contact & Institutional Data
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">PRIMARY GUARDIAN PHONE</p>
                <p className="font-semibold text-gray-900 font-mono text-sm mt-1 flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" /> {student.guardian_phone}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ALTERNATIVE PHONE</p>
                <p className="font-semibold text-gray-900 font-mono text-sm mt-1">
                  {student.alternative_phone || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">EMAIL ADDRESS</p>
                <p className="font-semibold text-gray-900 text-sm mt-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" /> {student.email || institution?.email || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">NOMINATING INSTITUTION</p>
                <p className="font-semibold text-emerald-800 text-sm mt-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-emerald-700" /> {institution?.name || `Institution #${student.institution_id}`}
                </p>
              </div>
            </div>
          </div>

          {/* Review Audit History / Notes */}
          {student.rejection_reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-xs text-rose-900">
              <p className="font-bold text-rose-900 uppercase tracking-wider text-[11px]">Rejection Reason</p>
              <p className="mt-1">{student.rejection_reason}</p>
            </div>
          )}

        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          
          {/* Memorization Category Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">MEMORIZATION CATEGORY</p>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="text-xs font-bold text-[#c99335] hover:underline flex items-center gap-1"
              >
                Change ↗
              </button>
            </div>
            <div className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-serif font-bold text-xl text-gray-900">
                  {currentCat ? (isAr ? currentCat.name_ar : currentCat.name_en) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Age limit: {currentCat?.max_age ? `${currentCat.max_age} yrs` : 'No limit'}
                </p>
              </div>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="btn-secondary !py-1 !px-3 text-xs"
              >
                Change
              </button>
            </div>
          </div>

          {/* Applicant Photo Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-left">APPLICANT PHOTO</p>
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs font-bold text-[#c99335] hover:underline"
              >
                Change 📷
              </button>
            </div>

            <div className="relative mx-auto w-40 h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center mb-4">
              {student.photo ? (
                <Image
                  src={student.photo}
                  alt={student.full_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <UserCheck size={36} />
                  <span className="text-xs font-medium">Passport Photo</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              {student.photo && (
                <a
                  href={student.photo}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !py-1 !px-3 text-xs"
                >
                  View Full ↗
                </a>
              )}
              <button
                onClick={() => setShowEdit(true)}
                className="btn-secondary !py-1 !px-3 text-xs"
              >
                Update Photo
              </button>
            </div>
          </div>

          {/* Attached Documents Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ATTACHED DOCUMENTS</p>
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs font-bold text-[#c99335] hover:underline"
              >
                Replace 📎
              </button>
            </div>

            {student.id_document ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-gray-900 truncate">ID / Birth Certificate</p>
                    <p className="text-[10px] text-gray-500 font-mono">Presigned Secure Link</p>
                  </div>
                </div>
                <a
                  href={student.id_document}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !py-1 !px-2.5 text-xs text-emerald-800"
                >
                  View ↗
                </a>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-gray-300 rounded-xl text-center text-gray-400 text-xs">
                No identification document attached
              </div>
            )}
          </div>

          {/* Internal Review Notes & Decision Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">INTERNAL REVIEW NOTES</p>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder="Add private staff verification notes..."
                className="input-field text-xs resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveNotes}
                  className="btn-secondary !py-1 !px-3 text-xs"
                >
                  Save Notes
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <button
                onClick={handleApprove}
                disabled={student.review_status === 'APPROVED'}
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
              >
                <Check size={14} /> Approve Candidate
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={student.review_status === 'REJECTED'}
                className="w-full py-2.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/80 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <X size={14} /> Reject Entry
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit Profile — ${student.full_name}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" value={editDob} onChange={e => setEditDob(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select value={editGender} onChange={e => setEditGender(e.target.value as any)} className="input-field">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">National ID / Birth Cert #</label>
              <input value={editNationalId} onChange={e => setEditNationalId(e.target.value)} className="input-field font-mono" />
            </div>
            <div>
              <label className="label">Nationality</label>
              <input value={editNationality} onChange={e => setEditNationality(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Primary Guardian Phone</label>
              <input value={editGuardianPhone} onChange={e => setEditGuardianPhone(e.target.value)} className="input-field font-mono" />
            </div>
            <div>
              <label className="label">Alternative Phone</label>
              <input value={editAltPhone} onChange={e => setEditAltPhone(e.target.value)} className="input-field font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email Address</label>
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Current Residence</label>
              <input value={editResidence} onChange={e => setEditResidence(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveProfile} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Change Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Change Memorization Category">
        <div className="space-y-4">
          <div>
            <label className="label">Select New Category</label>
            <select
              value={selectedCatId}
              onChange={e => setSelectedCatId(Number(e.target.value))}
              className="input-field cursor-pointer"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {isAr ? c.name_ar : c.name_en} ({c.max_age ? `Max ${c.max_age} yrs` : 'Open'})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={ageExemption}
              onChange={e => setAgeExemption(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-xs font-semibold text-amber-900">
              Grant Age Exemption (Admin Override)
            </span>
          </label>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowCategoryModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReassignCategory} className="btn-primary">Update Category</button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Registration Entry" variant="danger">
        <div className="space-y-4">
          <div>
            <label className="label">Rejection Reason</label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Ineligible age, duplicate entry, invalid birth certificate..."
              className="input-field resize-none text-xs"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} className="btn-primary !bg-rose-700 hover:!bg-rose-800">Confirm Rejection</button>
          </div>
        </div>
      </Modal>

      {/* Delete / Archive Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Archive Candidate" variant="danger">
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Archiving will remove this candidate from the active competition roster. You can restore them anytime from the Archive page.
          </p>
          <div>
            <label className="label">Archival Reason</label>
            <textarea
              rows={2}
              value={deletionReason}
              onChange={e => setDeletionReason(e.target.value)}
              placeholder="e.g. Candidate withdrew, duplicate submission..."
              className="input-field resize-none text-xs"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn-primary !bg-rose-700 hover:!bg-rose-800">Archive Student</button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
