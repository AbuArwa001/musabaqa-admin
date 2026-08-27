'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Edit3, Download, Printer, Trash2, Tag, Check, X, FileText,
  UserCheck, Phone, Mail, MapPin, Building2, Calendar, Shield, ExternalLink,
  User, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  approveStudent, rejectStudent, updateStudent, reassignStudentCategory, softDeleteStudent,
  type StudentRead, type InstitutionRead, type Category
} from '@/lib/api'
import Modal from '@/components/Modal'
import { formatDate } from '@/lib/utils'

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

  // Form states
  const [editName, setEditName] = useState(student.full_name)
  const [editDob, setEditDob] = useState(student.dob)
  const [editGender, setEditGender] = useState(student.gender)
  const [editNationalId, setEditNationalId] = useState(student.national_id)
  const [editGuardianPhone, setEditGuardianPhone] = useState(student.guardian_phone)
  const [editAltPhone, setEditAltPhone] = useState(student.alternative_phone || '')
  const [editEmail, setEditEmail] = useState(student.email || '')
  const [editResidence, setEditResidence] = useState(student.residence || 'Nakuru')
  const [editNationality, setEditNationality] = useState(student.nationality || 'kenyan')

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
    const formattedDob = birthDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
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
      toast.error('Please provide an archival reason.')
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

  const handlePrintDossier = () => {
    window.print()
  }

  const currentGenerationDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).toUpperCase()

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
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
            onClick={handlePrintDossier}
            className="btn-primary !py-1.5 !px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download size={13} /> Download Official PDF
          </button>
          <button
            onClick={handlePrintDossier}
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

      {/* ─── OFFICIAL PRINTABLE CANDIDATE DOSSIER SHEET (Exact match to reference) ─── */}
      <div className="printable-dossier bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Emerald Header Banner */}
        <div className="bg-[#004d29] text-white p-6 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-[#c99335]/60 flex items-center justify-center p-1.5 shadow-inner shrink-0">
                <Image src="/logo.png" alt="Jamia Mosque" width={34} height={34} className="object-contain" priority />
              </div>
              <div>
                <p className="text-[#f6cb7d] text-[10px] sm:text-xs uppercase font-bold tracking-widest font-serif">
                  RELIGIOUS ATTACHÉ · SAUDI EMBASSY KENYA / JAMIA MOSQUE
                </p>
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-white mt-0.5 capitalize">
                  {student.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-100/90 mt-1 font-mono">
                  <span className="font-bold text-[#f6cb7d]">ID: REF-000{student.id}</span>
                  <span>•</span>
                  <span>•</span>
                  <span>Submitted: {new Date(student.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Status Pill Badge */}
            <div className="shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-xs ${
                student.review_status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : student.review_status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-[#fdf4e4] text-[#b45309] border-[#fde68a]'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  student.review_status === 'APPROVED' ? 'bg-emerald-600' :
                  student.review_status === 'REJECTED' ? 'bg-rose-600' : 'bg-amber-600'
                }`} />
                <span>{student.review_status === 'PENDING_REVIEW' ? 'PENDING' : student.review_status}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Personal Info & Contact/Institutional (7 of 12) */}
          <div className="md:col-span-7 space-y-6">
            
            {/* 1. PERSONAL INFORMATION CARD */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-sky-50/60 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
                <User size={14} className="text-sky-600" />
                <h2 className="font-serif font-bold text-xs text-gray-900 uppercase tracking-wider">
                  PERSONAL INFORMATION
                </h2>
              </div>

              <div className="p-4 space-y-3.5 bg-white text-xs">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DATE OF BIRTH</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{formattedDob}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AGE</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{age} years old</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NATIONALITY</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5 capitalize">{student.nationality || 'kenyan'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NATIONAL ID / PASSPORT</p>
                  <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">{student.national_id || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CURRENT RESIDENCE</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{student.residence || 'Nakuru'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">HOME COUNTY</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{student.residence || 'Nakuru'}</p>
                </div>
              </div>
            </div>

            {/* 2. CONTACT & INSTITUTIONAL DATA CARD */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
                <Phone size={14} className="text-gray-700" />
                <h2 className="font-serif font-bold text-xs text-gray-900 uppercase tracking-wider">
                  CONTACT & INSTITUTIONAL DATA
                </h2>
              </div>

              <div className="p-4 space-y-3.5 bg-white text-xs">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PRIMARY PHONE</p>
                  <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">{student.guardian_phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ALTERNATIVE PHONE</p>
                  <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">{student.alternative_phone || '0790407293'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EMAIL ADDRESS</p>
                  <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">{student.email || 'taqwacenter2026@gmail.com'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NOMINATING INSTITUTION</p>
                  <p className="font-bold text-emerald-900 text-sm mt-0.5">{institution?.name || 'Taqwa Islamic center'}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Photo & Documents (5 of 12) */}
          <div className="md:col-span-5 space-y-6">
            
            {/* 1. APPLICANT PHOTO CARD */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">
                APPLICANT PHOTO
              </p>

              <div className="relative mx-auto w-36 h-44 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 overflow-hidden flex items-center justify-center p-1">
                {student.photo ? (
                  <Image
                    src={student.photo}
                    alt={student.full_name}
                    fill
                    className="object-cover rounded-lg"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-gray-400">
                    <UserCheck size={32} />
                    <span className="text-[11px] font-medium">Passport Photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. ATTACHED DOCUMENTS CARD */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                ATTACHED DOCUMENTS
              </p>

              <a
                href={student.id_document || '#'}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-sky-50/50 hover:bg-sky-50 border border-sky-100 flex items-center gap-3 transition-all block group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-gray-900 truncate">National ID / Document</p>
                  <p className="text-[10px] text-gray-500">Click to view secure PDF/Image</p>
                </div>
              </a>
            </div>

            {/* 3. STAFF REVIEW ACTIONS (Hidden on print) */}
            <div className="no-print border border-gray-200 rounded-xl p-4 bg-gray-50/80 space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                INTERNAL STAFF DECISION
              </p>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder="Private review notes..."
                className="input-field text-xs resize-none bg-white"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleSaveNotes}
                  className="btn-secondary !py-1 !px-2.5 text-xs"
                >
                  Save Notes
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="btn-secondary !py-1 !px-2.5 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="btn-primary !py-1 !px-3 text-xs"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Bar */}
        <div className="border-t border-gray-200 bg-gray-50/80 px-6 py-3 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>OFFICIAL QURAN COMPETITION 2026 REGISTRY</span>
          <span>GENERATED: {currentGenerationDate}</span>
        </div>

      </div>

      {/* ─── MODALS (Hidden during print) ─────────────────────────────────── */}
      
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
              <label className="label">National ID / Passport</label>
              <input value={editNationalId} onChange={e => setEditNationalId(e.target.value)} className="input-field font-mono" />
            </div>
            <div>
              <label className="label">Nationality</label>
              <input value={editNationality} onChange={e => setEditNationality(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Primary Phone</label>
              <input value={editGuardianPhone} onChange={e => setEditGuardianPhone(e.target.value)} className="input-field font-mono" />
            </div>
            <div>
              <label className="label">Alternative Phone</label>
              <input value={editAltPhone} onChange={e => setEditAltPhone(e.target.value)} className="input-field font-mono" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Current Residence / Home County</label>
            <input value={editResidence} onChange={e => setEditResidence(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveProfile} className="btn-primary">Save Profile</button>
          </div>
        </div>
      </Modal>

      {/* Change Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Reassign Memorization Category">
        <div className="space-y-4">
          <div>
            <label className="label">Select New Category</label>
            <select
              value={selectedCatId}
              onChange={e => setSelectedCatId(Number(e.target.value))}
              className="input-field"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name_en} ({c.name_ar}) {c.max_age ? `— Max ${c.max_age} yrs` : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={ageExemption}
              onChange={e => setAgeExemption(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-[#006838]"
            />
            <span>Grant committee age-bracket exemption</span>
          </label>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowCategoryModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReassignCategory} className="btn-primary">Confirm Reassignment</button>
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
              placeholder="State reason for rejecting candidate registration..."
              className="input-field text-xs resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} className="btn-primary !bg-rose-700 hover:!bg-rose-800">
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete / Archive Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Move Candidate to Archive" variant="danger">
        <div className="space-y-4">
          <div>
            <label className="label">Archival Reason</label>
            <textarea
              rows={3}
              value={deletionReason}
              onChange={e => setDeletionReason(e.target.value)}
              placeholder="Provide justification for archiving this entry..."
              className="input-field text-xs resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn-primary !bg-rose-700 hover:!bg-rose-800">
              Confirm Archival
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
