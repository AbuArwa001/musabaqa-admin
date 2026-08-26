'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Check, X, ArrowUpDown, Edit, Search, Users, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

import {
  approveStudent, rejectStudent, reassignStudentCategory,
  type StudentRead, type InstitutionRead, type Category, type Region
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDate } from '@/lib/utils'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'

const rejectSchema = z.object({ rejection_reason: z.string().min(5) })
const reassignSchema = z.object({ category_id: z.string().min(1) })

type StudentsClientProps = {
  initialData: StudentRead[]
  institutions: InstitutionRead[]
  categories: Category[]
  regions: Region[]
  dict: Dict
  locale: string
  token: string
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
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

  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [reassigningId, setReassigningId] = useState<number | null>(null)
  const [showAgeWarning, setShowAgeWarning] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const { register: regReject, handleSubmit: handleReject, reset: resetReject, formState: { errors: errReject, isSubmitting: isSubReject } } = useForm<{ rejection_reason: string }>({ resolver: zodResolver(rejectSchema) })
  const { register: regReassign, handleSubmit: handleReassign, reset: resetReassign, watch, formState: { isSubmitting: isSubReassign } } = useForm<{ category_id: string }>({ resolver: zodResolver(reassignSchema) })

  const instMap = useMemo(() => Object.fromEntries(institutions.map(i => [i.id, i])), [institutions])
  const catMap  = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const regMap  = useMemo(() => Object.fromEntries(regions.map(r => [r.id, r])), [regions])

  const totalStudents   = data.length
  const pendingStudents = data.filter(s => s.review_status === 'PENDING_REVIEW').length
  const approvedStudents = data.filter(s => s.review_status === 'APPROVED').length
  const rejectedStudents = data.filter(s => s.review_status === 'REJECTED').length

  const handleApprove = async (id: number) => {
    setApprovingId(id)
    try {
      const updated = await approveStudent(token, id)
      setData(d => d.map(s => s.id === id ? updated : s))
      toast.success('Student approved')
    } catch (e: any) { toast.error(e.message || tc.error) }
    finally { setApprovingId(null) }
  }

  const onRejectSubmit = async (formData: { rejection_reason: string }) => {
    if (!rejectingId) return
    try {
      const updated = await rejectStudent(token, rejectingId, formData.rejection_reason)
      setData(d => d.map(s => s.id === rejectingId ? updated : s))
      toast.success('Student rejected')
      setRejectingId(null)
      resetReject()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const checkAgeWarning = (student: StudentRead, catId: number) => {
    const cat = catMap[catId]
    if (!cat) return false
    const dob = new Date(student.dob)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    return Boolean((cat.min_age && age < cat.min_age) || (cat.max_age && age > cat.max_age))
  }

  const onReassignSubmit = async (formData: { category_id: string }) => {
    if (!reassigningId) return
    const student = data.find(s => s.id === reassigningId)!
    const catId = Number(formData.category_id)
    if (!showAgeWarning && checkAgeWarning(student, catId)) {
      setShowAgeWarning(true)
      return
    }
    try {
      const updated = await reassignStudentCategory(token, reassigningId, catId, showAgeWarning)
      setData(d => d.map(s => s.id === reassigningId ? updated : s))
      toast.success('Category reassigned')
      setReassigningId(null)
      setShowAgeWarning(false)
      resetReassign()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const columnHelper = createColumnHelper<StudentRead>()
  const columns = [
    columnHelper.accessor('full_name', {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-gray-500 cursor-pointer">
          {t.col_name} <ArrowUpDown size={12} />
        </button>
      ),
      cell: info => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(info.getValue())}
          </div>
          <span className="font-semibold text-sm text-gray-900">
            {info.getValue()}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('category_id', {
      header: t.col_category,
      cell: info => {
        const cat = catMap[info.getValue()]
        return <span className="text-gray-700 text-xs font-medium">{cat ? (isAr ? cat.name_ar : cat.name_en) : '—'}</span>
      }
    }),
    columnHelper.accessor('institution_id', {
      header: t.col_institution,
      cell: info => <span className="text-gray-700 text-xs">{instMap[info.getValue()]?.name || '—'}</span>
    }),
    columnHelper.accessor(row => {
      const inst = instMap[row.institution_id]
      if (!inst || !inst.region_id) return ''
      const reg = regMap[inst.region_id]
      return reg ? (isAr ? reg.name_ar : reg.name_en) : ''
    }, {
      id: 'region',
      header: t.col_region,
      cell: info => <span className="text-gray-500 text-xs">{info.getValue() || '—'}</span>
    }),
    columnHelper.accessor('review_status', {
      header: t.col_status,
      cell: info => {
        const val = info.getValue()
        return (
          <span className={val === 'APPROVED' ? 'badge-approved' : val === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
            {val === 'APPROVED' ? tc.status_approved : val === 'REJECTED' ? tc.status_rejected : tc.status_pending}
          </span>
        )
      }
    }),
    columnHelper.accessor('created_at', {
      header: t.col_created,
      cell: info => <span className="text-gray-500 text-xs">{formatDate(info.getValue())}</span>
    }),
    columnHelper.display({
      id: 'actions',
      header: tc.actions,
      cell: ({ row }) => {
        const s = row.original
        const isApproving = approvingId === s.id
        return (
          <div className="flex items-center gap-1.5">
            {s.review_status === 'PENDING_REVIEW' && (
              <>
                <button
                  onClick={() => handleApprove(s.id)}
                  disabled={isApproving}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                  title={t.approve}
                >
                  {isApproving ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                </button>
                <button
                  onClick={() => { setRejectingId(s.id); resetReject() }}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                  title={t.reject}
                >
                  <X size={13} />
                </button>
              </>
            )}
            <button
              onClick={() => { setReassigningId(s.id); setShowAgeWarning(false); resetReassign() }}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
              title={t.reassign}
            >
              <Edit size={13} />
            </button>
          </div>
        )
      }
    })
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-6">
      <PageHeader title={t.title} subtitle={`${totalStudents} total registered contestants`} />

      {/* Stats summary row matching jamia-admin */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: totalStudents,    icon: <Users size={15} />,       badge: 'bg-purple-50 text-purple-700 border-purple-200', numColor: 'text-purple-950' },
          { label: 'Pending',  value: pendingStudents,  icon: <Clock size={15} />,       badge: 'bg-amber-50 text-amber-700 border-amber-200',   numColor: 'text-amber-950' },
          { label: 'Approved', value: approvedStudents, icon: <CheckCircle size={15} />, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', numColor: 'text-emerald-950' },
          { label: 'Rejected', value: rejectedStudents, icon: <XCircle size={15} />,     badge: 'bg-rose-50 text-rose-700 border-rose-200',       numColor: 'text-rose-950' },
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

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder={t.search_placeholder}
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Table Card */}
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
                  <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No students found</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
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

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectingId}
        onClose={() => setRejectingId(null)}
        title={t.reject_title}
        variant="danger"
      >
        <form onSubmit={handleReject(onRejectSubmit)} noValidate className="space-y-4">
          <div>
            <label className="label">{t.reject_reason_label}</label>
            <textarea
              {...regReject('rejection_reason')}
              rows={4}
              className="input-field resize-none"
            />
            {errReject.rejection_reason && <p className="error-text">Reason required (min 5 chars)</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setRejectingId(null)} className="btn-secondary">
              {tc.cancel}
            </button>
            <button type="submit" disabled={isSubReject} className="btn-primary !bg-rose-700 hover:!bg-rose-800">
              {isSubReject ? <><Loader2 size={15} className="animate-spin" /> Rejecting...</> : t.reject_confirm}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={!!reassigningId}
        onClose={() => setReassigningId(null)}
        title={t.reassign_title}
        variant="warning"
      >
        <form onSubmit={handleReassign(onReassignSubmit)} noValidate className="space-y-4">
          <div>
            <label className="label">{t.reassign_label}</label>
            <select
              {...regReassign('category_id')}
              className="input-field cursor-pointer"
              onChange={() => setShowAgeWarning(false)}
            >
              <option value="">Select Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>
              ))}
            </select>
          </div>
          {showAgeWarning && (
            <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{t.reassign_age_warning}</span>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setReassigningId(null)} className="btn-secondary">
              {tc.cancel}
            </button>
            <button type="submit" disabled={isSubReassign} className="btn-primary">
              {isSubReassign ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : t.reassign_confirm}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
