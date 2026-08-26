'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Building2, Phone, Mail, MapPin, UserCheck, FileText, Check, X, Printer, Download, Edit3, ShieldCheck, Award, FileCheck2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  approveInstitution, rejectInstitution, updateInstitution,
  type InstitutionRead, type StudentRead, type Category, type Region
} from '@/lib/api'
import Modal from '@/components/Modal'

export default function InstitutionDetailClient({
  initialInstitution, students, categories, regions, locale, token
}: {
  initialInstitution: InstitutionRead
  students: StudentRead[]
  categories: Category[]
  regions: Region[]
  locale: string
  token: string
}) {
  const [inst, setInst] = useState<InstitutionRead>(initialInstitution)
  const isAr = locale === 'ar'

  const [showEdit, setShowEdit] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Edit form states
  const [editName, setEditName] = useState(inst.name)
  const [editType, setEditType] = useState(inst.type)
  const [editContact, setEditContact] = useState(inst.contact_person)
  const [editPhone, setEditPhone] = useState(inst.phone)
  const [editEmail, setEditEmail] = useState(inst.email)
  const [editAddress, setEditAddress] = useState(inst.address || 'Eastleigh 12th Street, Nairobi')

  const catMap = Object.fromEntries(categories.map(c => [c.id, isAr ? c.name_ar : c.name_en]))
  const region = regions.find(r => r.id === inst.region_id)

  const handleApprove = async () => {
    try {
      const updated = await approveInstitution(token, inst.id)
      setInst(updated)
      toast.success('Institution eligibility approved successfully!')
    } catch (e: any) { toast.error(e.message || 'Failed to approve institution') }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.')
      return
    }
    try {
      const updated = await rejectInstitution(token, inst.id, rejectionReason)
      setInst(updated)
      setShowRejectModal(false)
      toast.success('Institution rejected.')
    } catch (e: any) { toast.error(e.message || 'Failed to reject institution') }
  }

  const handleSaveProfile = async () => {
    try {
      const updated = await updateInstitution(token, inst.id, {
        name: editName,
        type: editType,
        contact_person: editContact,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
      })
      setInst(updated)
      setShowEdit(false)
      toast.success('Institution details updated successfully.')
    } catch (e: any) { toast.error(e.message || 'Failed to update institution') }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/${locale}/dashboard/institutions`}
          className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-xs font-semibold"
        >
          <ArrowLeft size={15} /> Back to Institutions
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Edit3 size={13} className="text-emerald-700" /> Edit Details
          </button>
          <button
            onClick={() => toast.success(`Downloading official institution dossier for ${inst.name}...`)}
            className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Download size={13} /> Download Dossier
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Printer size={13} /> Print View
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-[#004d29] text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-[#006838]">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Building2 size={30} className="text-[#c99335]" />
            </div>
            <div>
              <p className="text-[#c99335] text-xs uppercase font-bold tracking-widest font-serif">
                Registered Islamic Institution · Musabaqa 2026
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mt-1">
                {inst.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100/80 mt-2">
                <span className="font-mono bg-white/10 px-2.5 py-0.5 rounded text-white font-semibold">
                  ID: INST-000{inst.id}
                </span>
                <span>•</span>
                <span className="bg-[#c99335]/20 text-[#f6cb7d] px-2.5 py-0.5 rounded font-semibold border border-[#c99335]/40">
                  {inst.type}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-rose-400" />
                  {region ? (isAr ? region.name_ar : region.name_en) : 'Nairobi'}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span className={
              inst.status === 'APPROVED' ? 'bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5' :
              inst.status === 'REJECTED' ? 'bg-rose-500 text-white font-bold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5' :
              'bg-amber-500 text-white font-bold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5'
            }>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {inst.status}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Institutional Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <Building2 size={16} className="text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                Institutional Profile & Contacts
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">HEAD USTADH / CONTACT PERSON</p>
                <p className="font-semibold text-gray-900 text-sm mt-1 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-gray-400" /> {inst.contact_person}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">OFFICIAL TELEPHONE</p>
                <p className="font-semibold text-gray-900 font-mono text-sm mt-1 flex items-center gap-1.5">
                  <Phone size={14} className="text-gray-400" /> {inst.phone}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">OFFICIAL EMAIL</p>
                <p className="font-semibold text-gray-900 text-sm mt-1 flex items-center gap-1.5">
                  <Mail size={14} className="text-gray-400" /> {inst.email}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">PHYSICAL LOCATION & ADDRESS</p>
                <p className="font-semibold text-gray-900 text-sm mt-1 flex items-center gap-1.5">
                  <MapPin size={14} className="text-rose-500" /> {inst.address || 'Eastleigh 12th Street, Nairobi'}
                </p>
              </div>
            </div>
          </div>

          {/* Student Candidates Roster Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <h2 className="font-serif font-bold text-sm text-gray-900">
                Registered Student Candidates ({students.length})
              </h2>
              <span className="text-xs font-semibold text-gray-500">
                1 Candidate per category limit
              </span>
            </div>

            {students.length === 0 ? (
              <p className="p-8 text-center text-gray-400 text-xs font-medium">
                No candidates registered yet by this institution.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/60 border-b border-gray-200">
                    <tr>
                      <th className="table-th">Candidate</th>
                      <th className="table-th">Category</th>
                      <th className="table-th">Status</th>
                      <th className="table-th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="table-td">
                          <Link
                            href={`/${locale}/dashboard/students/${s.id}`}
                            className="font-bold text-sm text-gray-900 hover:text-emerald-800"
                          >
                            {s.full_name}
                          </Link>
                          <p className="text-xs text-gray-500 font-mono">REF-000{s.id}</p>
                        </td>
                        <td className="table-td text-gray-800 text-xs font-serif font-bold">
                          {catMap[s.category_id] || '—'}
                        </td>
                        <td className="table-td">
                          <span className={s.review_status === 'APPROVED' ? 'badge-approved' : s.review_status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
                            {s.review_status}
                          </span>
                        </td>
                        <td className="table-td text-right">
                          <Link
                            href={`/${locale}/dashboard/students/${s.id}`}
                            className="btn-secondary !py-1 !px-2.5 text-xs text-sky-800"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rejection notice if present */}
          {inst.rejection_reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-xs text-rose-900">
              <p className="font-bold uppercase tracking-wider text-[11px]">Rejection Reason</p>
              <p className="mt-1">{inst.rejection_reason}</p>
            </div>
          )}

        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          
          {/* Eligibility & Legal Recognition Documents (User requirement) */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="pb-3 border-b border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                ELIGIBILITY & RECOGNITION DOCUMENTS
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Official Madrasa verification & registration proofs
              </p>
            </div>

            {/* Document Item 1: Registration Certificate */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-gray-900 truncate">Registration Certificate</p>
                  <p className="text-[10px] text-gray-500">Registrar / SUPKEM / CIPK</p>
                </div>
              </div>
              <button
                onClick={() => toast.info('Viewing Registration Certificate attachment...')}
                className="btn-secondary !py-1 !px-2.5 text-xs text-emerald-800 flex items-center gap-1"
              >
                <ExternalLink size={11} /> View
              </button>
            </div>

            {/* Document Item 2: Title Deed / Premises Recognition Proof */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Award size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-gray-900 truncate">Title Deed / Premises Proof</p>
                  <p className="text-[10px] text-gray-500">Waqf Deed / Mosque Land Proof</p>
                </div>
              </div>
              <button
                onClick={() => toast.info('Viewing Waqf Deed / Premises Proof attachment...')}
                className="btn-secondary !py-1 !px-2.5 text-xs text-amber-800 flex items-center gap-1"
              >
                <ExternalLink size={11} /> View
              </button>
            </div>

            {/* Document Item 3: Imam / Head Ustadh Recommendation */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <FileCheck2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-gray-900 truncate">Head Ustadh Endorsement</p>
                  <p className="text-[10px] text-gray-500">Official Stamped Letter</p>
                </div>
              </div>
              <button
                onClick={() => toast.info('Viewing Endorsement Letter attachment...')}
                className="btn-secondary !py-1 !px-2.5 text-xs text-sky-800 flex items-center gap-1"
              >
                <ExternalLink size={11} /> View
              </button>
            </div>
          </div>

          {/* Review Decision Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              ELIGIBILITY REVIEW DECISION
            </p>
            <button
              onClick={handleApprove}
              disabled={inst.status === 'APPROVED'}
              className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Approve Institution
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={inst.status === 'REJECTED'}
              className="w-full py-2.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/80 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <X size={14} /> Reject Institution
            </button>
          </div>

        </div>

      </div>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit Institution — ${inst.name}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Institution Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select value={editType} onChange={e => setEditType(e.target.value)} className="input-field">
                <option value="MADRASA">Madrasa</option>
                <option value="SCHOOL">Islamic School</option>
                <option value="MOSQUE">Mosque</option>
              </select>
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input value={editContact} onChange={e => setEditContact(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="input-field font-mono" />
            </div>
            <div>
              <label className="label">Email</label>
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Physical Address</label>
            <input value={editAddress} onChange={e => setEditAddress(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveProfile} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Institution" variant="danger">
        <div className="space-y-4">
          <div>
            <label className="label">Rejection Reason</label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing valid registration documents or unverified premises..."
              className="input-field resize-none text-xs"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} className="btn-primary !bg-rose-700 hover:!bg-rose-800">Confirm Rejection</button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
