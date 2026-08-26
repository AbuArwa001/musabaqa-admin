'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  Check, X, Search, Users, Clock, CheckCircle, XCircle, Loader2,
  FileText, Edit3, Tag, Trash2, Eye, Zap, MapPin, Download, ArrowUpDown
} from 'lucide-react'

import {
  approveStudent, rejectStudent, reassignStudentCategory, updateStudent,
  bulkSoftDeleteStudents,
  type StudentRead, type InstitutionRead, type Category, type Region
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'
import DossierGeneratorModal from '@/components/DossierGeneratorModal'

type StudentsClientProps = {
  initialData: StudentRead[]
  institutions: InstitutionRead[]
  categories: Category[]
  regions: Region[]
  dict: Dict
  locale: string
  token: string
}

export default function StudentsClient({
  initialData, institutions, categories, regions, dict, locale, token
}: StudentsClientProps) {
  const t = dict.students
  const tc = dict.common
  const isAr = locale === 'ar'

  const [data, setData] = useState(initialData)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // Modals & Action States
  const [showDossierModal, setShowDossierModal] = useState(false)
  const [showMultiSortModal, setShowMultiSortModal] = useState(false)

  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [reassigningStudent, setReassigningStudent] = useState<StudentRead | null>(null)
  const [reassignCatId, setReassignCatId] = useState<number>(0)
  const [ageExemption, setAgeExemption] = useState(false)

  const [editingStudent, setEditingStudent] = useState<StudentRead | null>(null)
  const [editName, setEditName] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [editNationalId, setEditNationalId] = useState('')
  const [editGuardianPhone, setEditGuardianPhone] = useState('')

  const [bulkRejectModal, setBulkRejectModal] = useState(false)
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const [bulkReason, setBulkReason] = useState('')

  const [approvingId, setApprovingId] = useState<number | null>(null)

  // Multi-Sort tiers
  const [sortTier1, setSortTier1] = useState<{ id: string; desc: boolean }>({ id: 'created_at', desc: true })
  const [sortTier2, setSortTier2] = useState<{ id: string; desc: boolean }>({ id: '', desc: false })

  const instMap = useMemo(() => Object.fromEntries(institutions.map(i => [i.id, i])), [institutions])
  const catMap  = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const regMap  = useMemo(() => Object.fromEntries(regions.map(r => [r.id, r])), [regions])

  const totalStudents    = data.length
  const pendingStudents  = data.filter(s => s.review_status === 'PENDING_REVIEW').length
  const approvedStudents = data.filter(s => s.review_status === 'APPROVED').length
  const rejectedStudents = data.filter(s => s.review_status === 'REJECTED').length

  const selectedStudentList = useMemo(() => {
    return Object.keys(rowSelection).filter(k => rowSelection[k]).map(idx => data[Number(idx)]).filter(Boolean)
  }, [rowSelection, data])

  const calculateAgeInfo = (dobString: string) => {
    if (!dobString) return { age: 0, formattedDob: '—' }
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    const formattedDob = birthDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    return { age, formattedDob }
  }

  const handleApprove = async (id: number) => {
    setApprovingId(id)
    try {
      const updated = await approveStudent(token, id)
      setData(d => d.map(s => s.id === id ? updated : s))
      toast.success('Candidate approved')
    } catch (e: any) { toast.error(e.message || tc.error) }
    finally { setApprovingId(null) }
  }

  const handleSingleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return
    try {
      const updated = await rejectStudent(token, rejectingId, rejectionReason)
      setData(d => d.map(s => s.id === rejectingId ? updated : s))
      toast.success('Candidate rejected')
      setRejectingId(null)
      setRejectionReason('')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleBulkApprove = async () => {
    const ids = selectedStudentList.map(s => s.id)
    if (ids.length === 0) return
    try {
      for (const id of ids) {
        await approveStudent(token, id)
      }
      setData(d => d.map(s => ids.includes(s.id) ? { ...s, review_status: 'APPROVED' } : s))
      toast.success(`Approved ${ids.length} candidate(s)`)
      setRowSelection({})
    } catch (e: any) { toast.error(e.message || 'Failed to approve selected candidates') }
  }

  const handleBulkReject = async () => {
    const ids = selectedStudentList.map(s => s.id)
    if (ids.length === 0 || !bulkReason.trim()) return
    try {
      for (const id of ids) {
        await rejectStudent(token, id, bulkReason)
      }
      setData(d => d.map(s => ids.includes(s.id) ? { ...s, review_status: 'REJECTED', rejection_reason: bulkReason } : s))
      toast.success(`Rejected ${ids.length} candidate(s)`)
      setRowSelection({})
      setBulkRejectModal(false)
      setBulkReason('')
    } catch (e: any) { toast.error(e.message || 'Failed to reject selected candidates') }
  }

  const handleBulkDelete = async () => {
    const ids = selectedStudentList.map(s => s.id)
    if (ids.length === 0 || !bulkReason.trim()) return
    try {
      await bulkSoftDeleteStudents(token, ids, bulkReason)
      setData(d => d.filter(s => !ids.includes(s.id)))
      toast.success(`Archived ${ids.length} candidate(s)`)
      setRowSelection({})
      setBulkDeleteModal(false)
      setBulkReason('')
    } catch (e: any) { toast.error(e.message || 'Failed to delete selected candidates') }
  }

  const handleOpenEdit = (student: StudentRead) => {
    setEditingStudent(student)
    setEditName(student.full_name)
    setEditDob(student.dob)
    setEditGender(student.gender)
    setEditNationalId(student.national_id)
    setEditGuardianPhone(student.guardian_phone)
  }

  const handleSaveEdit = async () => {
    if (!editingStudent) return
    try {
      const updated = await updateStudent(token, editingStudent.id, {
        full_name: editName,
        dob: editDob,
        gender: editGender,
        national_id: editNationalId,
        guardian_phone: editGuardianPhone,
      })
      setData(d => d.map(s => s.id === editingStudent.id ? updated : s))
      toast.success('Candidate profile updated')
      setEditingStudent(null)
    } catch (e: any) { toast.error(e.message || 'Failed to update candidate') }
  }

  const handleReassignSubmit = async () => {
    if (!reassigningStudent || !reassignCatId) return
    try {
      const updated = await reassignStudentCategory(token, reassigningStudent.id, reassignCatId, ageExemption)
      setData(d => d.map(s => s.id === reassigningStudent.id ? updated : s))
      toast.success('Category reassigned')
      setReassigningStudent(null)
    } catch (e: any) { toast.error(e.message || 'Failed to reassign category') }
  }

  const handleApplyMultiSort = () => {
    const newSorting: SortingState = []
    if (sortTier1.id) newSorting.push({ id: sortTier1.id, desc: sortTier1.desc })
    if (sortTier2.id) newSorting.push({ id: sortTier2.id, desc: sortTier2.desc })
    setSorting(newSorting)
    setShowMultiSortModal(false)
    toast.success('Applied multi-level sorting')
  }

  const columnHelper = createColumnHelper<StudentRead>()
  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#006838]"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#006838]"
        />
      ),
    }),
    columnHelper.accessor('full_name', {
      header: 'Candidate',
      cell: ({ row }) => {
        const s = row.original
        const inst = instMap[s.institution_id]
        return (
          <div className="py-1">
            <Link
              href={`/${locale}/dashboard/students/${s.id}`}
              className="font-bold text-sm text-gray-900 hover:text-emerald-800 transition-colors block"
            >
              {s.full_name}
            </Link>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
              <span className="font-mono text-emerald-800 font-semibold">REF-000{s.id}</span>
              <span>•</span>
              <span className="font-mono">{s.guardian_phone}</span>
              {s.email && (
                <>
                  <span>•</span>
                  <span className="text-gray-400">{s.email}</span>
                </>
              )}
            </div>
          </div>
        )
      }
    }),
    columnHelper.accessor('category_id', {
      header: 'Category & Age',
      cell: ({ row }) => {
        const s = row.original
        const cat = catMap[s.category_id]
        const { age, formattedDob } = calculateAgeInfo(s.dob)
        return (
          <div>
            <p className="font-serif font-bold text-sm text-gray-900">
              {cat ? (isAr ? cat.name_ar : cat.name_en) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Age: <span className="font-semibold text-gray-800">{age} yrs</span> ({formattedDob})
            </p>
          </div>
        )
      }
    }),
    columnHelper.accessor('institution_id', {
      header: 'Location & Institution',
      cell: ({ row }) => {
        const s = row.original
        const inst = instMap[s.institution_id]
        const reg = inst && inst.region_id ? regMap[inst.region_id] : null
        return (
          <div>
            <p className="font-bold text-xs text-gray-900 truncate max-w-[200px]">
              {inst?.name || `Institution #${s.institution_id}`}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <MapPin size={11} className="text-rose-500" />
              <span>{reg ? (isAr ? reg.name_ar : reg.name_en) : s.residence || 'Nairobi'}</span>
              <span className="text-[10px] text-gray-400">({s.nationality ? s.nationality.toLowerCase() : 'kenyan'})</span>
            </div>
          </div>
        )
      }
    }),
    columnHelper.accessor('review_status', {
      header: 'Status',
      cell: info => {
        const val = info.getValue()
        return (
          <span className={val === 'APPROVED' ? 'badge-approved' : val === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
            {val === 'APPROVED' ? '• Approved' : val === 'REJECTED' ? '• Rejected' : '• Pending'}
          </span>
        )
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const s = row.original
        const isApproving = approvingId === s.id
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/${locale}/dashboard/students/${s.id}`}
              className="btn-secondary !py-1 !px-2.5 text-xs font-semibold text-sky-800 hover:bg-sky-50 border-sky-200"
              title="View full details"
            >
              Details
            </Link>
            <button
              onClick={() => handleOpenEdit(s)}
              className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1 text-gray-700"
              title="Edit Profile"
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              onClick={() => { setReassigningStudent(s); setReassignCatId(s.category_id) }}
              className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1 text-[#c99335]"
              title="Change Category"
            >
              <Tag size={12} /> Category
            </button>
            {s.review_status !== 'APPROVED' && (
              <button
                onClick={() => handleApprove(s.id)}
                disabled={isApproving}
                className="btn-primary !py-1 !px-2 text-xs flex items-center gap-1"
                title="Approve"
              >
                {isApproving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Approve
              </button>
            )}
          </div>
        )
      }
    })
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        subtitle={`${totalStudents} total registered contestants across all categories`}
      />

      {/* Stats summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Active', value: totalStudents,    icon: <Users size={15} />,       badge: 'bg-purple-50 text-purple-700 border-purple-200', numColor: 'text-purple-950' },
          { label: 'Pending',      value: pendingStudents,  icon: <Clock size={15} />,       badge: 'bg-amber-50 text-amber-700 border-amber-200',   numColor: 'text-amber-950' },
          { label: 'Approved',     value: approvedStudents, icon: <CheckCircle size={15} />, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', numColor: 'text-emerald-950' },
          { label: 'Rejected',     value: rejectedStudents, icon: <XCircle size={15} />,     badge: 'bg-rose-50 text-rose-700 border-rose-200',       numColor: 'text-rose-950' },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className={`text-2xl font-bold font-serif ${stat.numColor}`}>{stat.value}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
            <div className={`p-2 rounded-lg border ${stat.badge}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Multi-Select Bulk Action Bar (matches reference screenshot) */}
      {selectedStudentList.length > 0 && (
        <div className="bg-[#1a1512] text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-[#2d2520] animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-emerald-600 font-bold text-xs text-white">
              {selectedStudentList.length} Selected
            </span>
            <span className="text-xs text-gray-300 font-medium hidden sm:inline">
              Apply bulk decision or export selected rows
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkApprove}
              className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            >
              <Check size={13} /> Approve ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setBulkRejectModal(true)}
              className="w-auto py-1.5 px-3 rounded-lg border border-rose-400/30 text-rose-300 bg-rose-900/40 hover:bg-rose-800/60 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X size={13} /> Reject ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setBulkDeleteModal(true)}
              className="w-auto py-1.5 px-3 rounded-lg border border-gray-700 text-gray-300 bg-black/40 hover:bg-gray-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} /> Delete ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setShowDossierModal(true)}
              className="btn-gold !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            >
              <Download size={13} /> Download PDFs ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setRowSelection({})}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Search + Multi-Level Sort button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search candidate name, institution, phone, or email..."
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="input-field pl-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMultiSortModal(true)}
            className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-2 font-bold"
          >
            <Zap size={14} className="text-[#c99335]" />
            <span>Multi-Level Sort</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
              {sorting.length || 1} tier
            </span>
          </button>

          <button
            onClick={() => {
              if (selectedStudentList.length === 0) {
                toast.info('Select candidates using the checkboxes to generate dossiers')
                return
              }
              setShowDossierModal(true)
            }}
            className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5 font-bold"
          >
            <FileText size={14} className="text-emerald-700" />
            <span>Dossier Generator</span>
          </button>
        </div>
      </div>

      {/* Candidates Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className="table-th">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No candidates match your search</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${row.getIsSelected() ? 'bg-emerald-50/40' : 'hover:bg-gray-50/60'}`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="table-td">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Dossier PDF Generator Modal */}
      <DossierGeneratorModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        selectedStudents={selectedStudentList.length > 0 ? selectedStudentList : data.slice(0, 10)}
        categories={categories}
        locale={locale}
        token={token}
      />

      {/* Multi-Level Sort Modal */}
      <Modal isOpen={showMultiSortModal} onClose={() => setShowMultiSortModal(false)} title="Multi-Level Sort">
        <div className="space-y-4">
          <div>
            <label className="label">Primary Sort Tier</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={sortTier1.id}
                onChange={e => setSortTier1(prev => ({ ...prev, id: e.target.value }))}
                className="input-field"
              >
                <option value="created_at">Submission Date</option>
                <option value="full_name">Candidate Name</option>
                <option value="dob">Date of Birth / Age</option>
                <option value="category_id">Category</option>
                <option value="review_status">Status</option>
              </select>
              <select
                value={sortTier1.desc ? 'desc' : 'asc'}
                onChange={e => setSortTier1(prev => ({ ...prev, desc: e.target.value === 'desc' }))}
                className="input-field"
              >
                <option value="asc">Ascending (A-Z / Oldest)</option>
                <option value="desc">Descending (Z-A / Newest)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Secondary Sort Tier (Optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={sortTier2.id}
                onChange={e => setSortTier2(prev => ({ ...prev, id: e.target.value }))}
                className="input-field"
              >
                <option value="">None</option>
                <option value="full_name">Candidate Name</option>
                <option value="category_id">Category</option>
                <option value="dob">Age</option>
                <option value="review_status">Status</option>
              </select>
              <select
                value={sortTier2.desc ? 'desc' : 'asc'}
                onChange={e => setSortTier2(prev => ({ ...prev, desc: e.target.value === 'desc' }))}
                className="input-field"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowMultiSortModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleApplyMultiSort} className="btn-primary">Apply Sorting</button>
          </div>
        </div>
      </Modal>

      {/* Edit Candidate Quick Modal */}
      <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} title={`Edit Profile — ${editingStudent?.full_name}`}>
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
              <label className="label">Guardian Phone</label>
              <input value={editGuardianPhone} onChange={e => setEditGuardianPhone(e.target.value)} className="input-field font-mono" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setEditingStudent(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveEdit} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Reassign Category Modal */}
      <Modal isOpen={!!reassigningStudent} onClose={() => setReassigningStudent(null)} title="Reassign Memorization Category">
        <div className="space-y-4">
          <div>
            <label className="label">Select New Category</label>
            <select
              value={reassignCatId}
              onChange={e => setReassignCatId(Number(e.target.value))}
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
            <button onClick={() => setReassigningStudent(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleReassignSubmit} className="btn-primary">Update Category</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Reject Modal */}
      <Modal isOpen={bulkRejectModal} onClose={() => setBulkRejectModal(false)} title={`Reject ${selectedStudentList.length} Selected Candidates`} variant="danger">
        <div className="space-y-4">
          <div>
            <label className="label">Rejection Reason for Selected</label>
            <textarea
              rows={3}
              value={bulkReason}
              onChange={e => setBulkReason(e.target.value)}
              placeholder="e.g. Quota limit exceeded, invalid verification documents..."
              className="input-field resize-none text-xs"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setBulkRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleBulkReject} className="btn-primary !bg-rose-700 hover:!bg-rose-800">Confirm Bulk Rejection</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal isOpen={bulkDeleteModal} onClose={() => setBulkDeleteModal(false)} title={`Archive ${selectedStudentList.length} Selected Candidates`} variant="danger">
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Archiving will remove selected candidates from the active competition roster.
          </p>
          <div>
            <label className="label">Archival Reason</label>
            <textarea
              rows={2}
              value={bulkReason}
              onChange={e => setBulkReason(e.target.value)}
              placeholder="Reason for archival..."
              className="input-field resize-none text-xs"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setBulkDeleteModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleBulkDelete} className="btn-primary !bg-rose-700 hover:!bg-rose-800">Archive Candidates</button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
