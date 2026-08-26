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
import { Check, X, ArrowUpDown, Edit, Search } from 'lucide-react'

import { 
  approveStudent, rejectStudent, reassignStudentCategory,
  type StudentRead, type InstitutionRead, type Category, type Region 
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDate } from '@/lib/utils'

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

  const { register: regReject, handleSubmit: handleReject, reset: resetReject, formState: { errors: errReject, isSubmitting: isSubReject } } = useForm<{ rejection_reason: string }>({ resolver: zodResolver(rejectSchema) })
  const { register: regReassign, handleSubmit: handleReassign, reset: resetReassign, watch, formState: { isSubmitting: isSubReassign } } = useForm<{ category_id: string }>({ resolver: zodResolver(reassignSchema) })

  const selectedCategoryId = watch('category_id')

  const instMap = useMemo(() => Object.fromEntries(institutions.map(i => [i.id, i])), [institutions])
  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const regMap = useMemo(() => Object.fromEntries(regions.map(r => [r.id, r])), [regions])

  const handleApprove = async (id: number) => {
    try {
      const updated = await approveStudent(token, id)
      setData(d => d.map(s => s.id === id ? updated : s))
      toast.success('Student approved')
    } catch (e: any) { toast.error(e.message || tc.error) }
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
    return (cat.min_age && age < cat.min_age) || (cat.max_age && age > cat.max_age)
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
        <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1">
          {t.col_name} <ArrowUpDown size={14} />
        </button>
      ),
      cell: info => <span className="font-medium text-white">{info.getValue()}</span>,
    }),
    columnHelper.accessor('category_id', {
      header: t.col_category,
      cell: info => {
        const cat = catMap[info.getValue()]
        return cat ? (isAr ? cat.name_ar : cat.name_en) : '—'
      }
    }),
    columnHelper.accessor('institution_id', {
      header: t.col_institution,
      cell: info => instMap[info.getValue()]?.name || '—'
    }),
    columnHelper.accessor(row => {
      const inst = instMap[row.institution_id]
      if (!inst || !inst.region_id) return ''
      const reg = regMap[inst.region_id]
      return reg ? (isAr ? reg.name_ar : reg.name_en) : ''
    }, {
      id: 'region',
      header: t.col_region,
      cell: info => info.getValue() || '—'
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
      cell: info => formatDate(info.getValue())
    }),
    columnHelper.display({
      id: 'actions',
      header: tc.actions,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center gap-2">
            {s.review_status === 'PENDING_REVIEW' && (
              <>
                <button onClick={() => handleApprove(s.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title={t.approve}>
                  <Check size={15} />
                </button>
                <button onClick={() => { setRejectingId(s.id); resetReject() }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title={t.reject}>
                  <X size={15} />
                </button>
              </>
            )}
            <button onClick={() => { setReassigningId(s.id); setShowAgeWarning(false); resetReassign() }} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title={t.reassign}>
              <Edit size={15} />
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
    <div>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400 mb-8">{t.title}</h1>
      
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
          <input 
            type="text" 
            placeholder={t.search_placeholder}
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-black/20">
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
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="table-td text-center text-stone-500 py-12">No students found</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="table-row-hover border-b border-white/5 last:border-0">
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
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass p-8 w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-bold text-white mb-6">{t.reject_title}</h2>
            <form onSubmit={handleReject(onRejectSubmit)} noValidate className="space-y-4">
              <div>
                <label className="label">{t.reject_reason_label}</label>
                <textarea {...regReject('rejection_reason')} rows={4} className="input-field resize-none" />
                {errReject.rejection_reason && <p className="error-text">Reason required (min 5 chars)</p>}
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSubReject} className="btn-danger flex-1">{t.reject_confirm}</button>
                <button type="button" onClick={() => setRejectingId(null)} className="btn-ghost">{tc.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassigningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass p-8 w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-bold text-white mb-6">{t.reassign_title}</h2>
            <form onSubmit={handleReassign(onReassignSubmit)} noValidate className="space-y-4">
              <div>
                <label className="label">{t.reassign_label}</label>
                <select {...regReassign('category_id')} className="input-field" onChange={() => setShowAgeWarning(false)}>
                  <option value="">Select...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>
                  ))}
                </select>
              </div>
              {showAgeWarning && (
                <div className="bg-amber-900/20 border border-amber-500/30 text-amber-400 text-sm p-3 rounded-xl">
                  {t.reassign_age_warning}
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={isSubReassign} className="btn-primary flex-1">{t.reassign_confirm}</button>
                <button type="button" onClick={() => setReassigningId(null)} className="btn-ghost">{tc.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
