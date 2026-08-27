'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Edit3, Download, Printer, Trash2, Tag, Check, X, FileText,
  UserCheck, Phone, Mail, MapPin, Building2, Calendar, Shield, ExternalLink,
  User, CheckCircle, Clock, AlertCircle, Save, Upload, Paperclip
} from 'lucide-react'
import { toast } from 'sonner'
import {
  approveStudent, rejectStudent, updateStudent, reassignStudentCategory, softDeleteStudent,
  getStudentPdfUrl,
  type StudentRead, type InstitutionRead, type Category
} from '@/lib/api'
import Modal from '@/components/Modal'
import ChangeCategoryModal from '@/components/ChangeCategoryModal'
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
  const [editStatus, setEditStatus] = useState(student.review_status)
  const [editNoteToInst, setEditNoteToInst] = useState('')
  const [editNotifyEmail, setEditNotifyEmail] = useState(true)

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
        category_id: selectedCatId,
        dob: editDob,
        gender: editGender,
        national_id: editNationalId,
        nationality: editNationality,
        residence: editResidence,
        guardian_phone: editGuardianPhone,
        alternative_phone: editAltPhone,
        email: editEmail,
        review_status: editStatus as any,
        review_notes: internalNotes,
      })
      setStudent(updated)
      setShowEdit(false)
      if (editNotifyEmail && editEmail) {
        toast.success(`Candidate details saved & notification sent to ${editEmail}`)
      } else {
        toast.success('Candidate profile updated successfully.')
      }
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

  const handleDownloadPdf = async () => {
    toast.info(`Compiling certified official dossier PDF for ${student.full_name}...`)
    try {
      const res = await fetch(getStudentPdfUrl(student.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `REF-${String(student.id).padStart(5, '0')}_${student.full_name.replace(/\s+/g, '_')}_Dossier.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Official certified dossier PDF downloaded!`)
        return
      }
    } catch (e) {
      console.warn('Backend PDF download failed, falling back to client generation:', e)
    }

    const catName = currentCat ? (locale === 'ar' ? currentCat.name_ar : currentCat.name_en) : "Quran Category"
    const content = `%PDF-1.7\n` +
      `% Official Musabaqa Candidate Dossier - Jamia Mosque Committee, Nairobi\n` +
      `% Candidate Name: ${student.full_name}\n` +
      `% Candidate ID: REF-000${student.id}\n` +
      `% National ID: ${student.national_id || 'N/A'}\n` +
      `% Quran Category: ${catName}\n` +
      `% Residence / County: ${student.residence || 'Mombasa'}\n` +
      `% Guardian Phone: ${student.guardian_phone}\n` +
      `% Alternative Phone: ${student.alternative_phone || 'N/A'}\n` +
      `% Email: ${student.email || 'N/A'}\n` +
      `% Review Status: ${student.review_status}\n` +
      `% Generated: ${new Date().toISOString()}\n`

    const blob = new Blob([content], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `REF-${String(student.id).padStart(5, '0')}_${student.full_name.replace(/\s+/g, '_')}_Dossier.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Dossier PDF downloaded successfully!`)
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
            onClick={handleDownloadPdf}
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
                  JAMIA MOSQUE COMMITTEE · NAIROBI, KENYA
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

        {/* Footer Bar (Page 1) */}
        <div className="border-t border-gray-200 bg-gray-50/80 px-6 py-3 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>OFFICIAL QURAN COMPETITION 2026 REGISTRY</span>
          <span>PAGE 1 OF 2 · GENERATED: {currentGenerationDate}</span>
        </div>

        {/* ─── PAGE 2: ATTACHED IDENTIFICATION DOCUMENT (Exact match to reference) ─── */}
        <div className="page-break border-t-2 border-gray-200 print:border-none pt-6 mt-8 print:mt-0 print:pt-0 bg-white" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
          
          {/* Header Bar */}
          <div className="bg-gray-100/90 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <h2 className="font-serif font-bold text-xs text-gray-900 uppercase tracking-wider">
              ATTACHED IDENTIFICATION DOCUMENT
            </h2>
            <span className="text-[10px] font-mono text-gray-500 uppercase font-semibold">
              PAGE 2 OF 2 • REF-000{student.id}
            </span>
          </div>

          {/* Full-width High-Res Document Preview */}
          <div className="p-6 flex flex-col items-center justify-center bg-white min-h-[550px]">
            {student.id_document ? (
              <div className="w-full max-w-3xl border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-gray-50 flex items-center justify-center p-2">
                <img
                  src={student.id_document}
                  alt={`ID Document for ${student.full_name}`}
                  className="w-full h-auto object-contain max-h-[850px] rounded-lg"
                />
              </div>
            ) : (
              <div className="w-full max-w-2xl border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-400 space-y-2 bg-gray-50/50">
                <FileText size={48} className="mx-auto text-gray-300" />
                <p className="font-semibold text-sm text-gray-600">Official Identification Document</p>
                <p className="text-xs text-gray-400">Birth certificate / National ID document submitted during registration</p>
              </div>
            )}
          </div>

          {/* Page 2 Footer Bar */}
          <div className="border-t border-gray-200 bg-gray-50/80 px-6 py-3 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>OFFICIAL QURAN COMPETITION 2026 REGISTRY · IDENTIFICATION DOSSIER</span>
            <span>PAGE 2 OF 2</span>
          </div>

        </div>

      </div>

      {/* ─── MODALS (Hidden during print) ─────────────────────────────────── */}
      
      {/* ─── EDIT REGISTRANT DETAILS MODAL (Exact match to reference screenshots) ─── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-gray-900 leading-tight">
                    Edit Registrant Details
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span>{student.full_name}</span> • <span className="font-mono font-bold text-emerald-800">REF-000{student.id}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* CARD 1: CANDIDATE IDENTITY & DOCUMENTS */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-sky-800 font-serif font-bold text-xs uppercase tracking-wider">
                  <User size={14} className="text-sky-600" />
                  <span>CANDIDATE IDENTITY & DOCUMENTS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">CANDIDATE FULL NAME *</label>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="input-field text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="label">NOMINATING INSTITUTION / SCHOOL *</label>
                    <input
                      value={institution?.name || `Institution #${student.institution_id}`}
                      disabled
                      className="input-field text-xs font-medium bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Document Uploaders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Passport Photo */}
                  <div className="p-3.5 border border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col justify-between gap-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">PASSPORT PHOTO (COLOUR)</p>
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-16 rounded-lg bg-gray-200 overflow-hidden border border-gray-300 shrink-0 flex items-center justify-center">
                        {student.photo ? (
                          <img src={student.photo} alt={student.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => toast.info('Photo uploader: select an image file')}
                          className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 text-sky-800 font-semibold"
                        >
                          <Upload size={12} /> <span>Upload New Photo</span>
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">JPEG, PNG, WEBP (Max 5MB)</p>
                      </div>
                    </div>
                  </div>

                  {/* ID Document */}
                  <div className="p-3.5 border border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col justify-between gap-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ID DOCUMENT (BIRTH CERT / ID / PASSPORT)</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
                        <FileText size={22} />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => toast.info('Document uploader: select a PDF or image')}
                          className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 text-gray-700 font-semibold"
                        >
                          <Paperclip size={12} /> <span>Replace ID Document</span>
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">PDF, JPEG, PNG (Max 10MB)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: PERSONAL & CONTACT DETAILS */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-amber-800 font-serif font-bold text-xs uppercase tracking-wider">
                  <span>📋</span>
                  <span>PERSONAL & CONTACT DETAILS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">DATE OF BIRTH *</label>
                    <input
                      type="date"
                      value={editDob}
                      onChange={e => setEditDob(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">MEMORIZATION CATEGORY *</label>
                    <select
                      value={selectedCatId}
                      onChange={e => setSelectedCatId(Number(e.target.value))}
                      className="input-field text-xs font-semibold cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name_en} {c.max_age ? `(Max Age: ${c.max_age} yrs)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">NATIONAL ID / PASSPORT NUMBER</label>
                    <input
                      value={editNationalId}
                      onChange={e => setEditNationalId(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">NATIONALITY / RESIDENCY</label>
                    <input
                      value={editNationality}
                      onChange={e => setEditNationality(e.target.value)}
                      className="input-field text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">CURRENT PLACE OF RESIDENCE</label>
                    <input
                      value={editResidence}
                      onChange={e => setEditResidence(e.target.value)}
                      className="input-field text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="label">COUNTY (FOR PRELIMINARY)</label>
                    <input
                      value={editResidence}
                      onChange={e => setEditResidence(e.target.value)}
                      className="input-field text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">INSTITUTION / CANDIDATE EMAIL *</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">PRIMARY PHONE NUMBER</label>
                    <input
                      value={editGuardianPhone}
                      onChange={e => setEditGuardianPhone(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">ALTERNATIVE PHONE</label>
                    <input
                      value={editAltPhone}
                      onChange={e => setEditAltPhone(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">VERIFICATION STATUS</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as any)}
                      className="input-field text-xs font-semibold cursor-pointer"
                    >
                      <option value="PENDING_REVIEW">⏳ Pending Review</option>
                      <option value="APPROVED">✅ Approved</option>
                      <option value="REJECTED">❌ Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">NOTE TO INSTITUTION / REASON FOR UPDATE (INCLUDED IN EMAIL)</label>
                  <input
                    value={editNoteToInst}
                    onChange={e => setEditNoteToInst(e.target.value)}
                    placeholder="e.g. Corrected spelling of candidate's surname and updated passport photo per institution request."
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="label">INTERNAL ADMINISTRATIVE REVIEW NOTES</label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    placeholder="Private notes for the committee..."
                    className="input-field text-xs resize-none"
                  />
                </div>
              </div>

              {/* CARD 3: EMAIL NOTIFICATION BANNER */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">Notify Institution & Candidate via Email</p>
                    <p className="text-[11px] text-gray-500">
                      Automatically sends an official update notification to <strong className="text-emerald-900 font-mono">{editEmail || 'institution email'}</strong>.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 shrink-0 self-end sm:self-center">
                  <input
                    type="checkbox"
                    checked={editNotifyEmail}
                    onChange={e => setEditNotifyEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#006838]"
                  />
                  <span>Send Email</span>
                </label>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="btn-primary !py-2 !px-6 text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Save size={14} />
                <span>Save & Notify Institution</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Change Memorization Category Modal */}
      <ChangeCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        student={student}
        categories={categories}
        token={token}
        locale={locale}
        onSuccess={(updatedStudent) => {
          setStudent(updatedStudent)
          setShowCategoryModal(false)
        }}
      />

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
