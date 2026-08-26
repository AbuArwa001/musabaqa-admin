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

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const avatarColors = ['#f0c060', '#00d88a', '#5b8df5', '#f56b7e', '#a78bfa', '#38bdf8']
function avatarColor(id: number) { return avatarColors[id % avatarColors.length] }

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

  const selectedCategoryId = watch('category_id')

  const instMap = useMemo(() => Object.fromEntries(institutions.map(i => [i.id, i])), [institutions])
  const catMap  = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const regMap  = useMemo(() => Object.fromEntries(regions.map(r => [r.id, r])), [regions])

  // Stats
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
        <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.7)' }}>
          {t.col_name} <ArrowUpDown size={12} />
        </button>
      ),
      cell: info => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
            style={{
              background: `${avatarColor(info.row.original.id)}18`,
              border: `1px solid ${avatarColor(info.row.original.id)}33`,
              color: avatarColor(info.row.original.id),
              fontFamily: 'var(--font-display)',
            }}
          >
            {getInitials(info.getValue())}
          </div>
          <span className="font-semibold text-sm" style={{ color: '#f0f0ff', fontFamily: 'var(--font-display)' }}>
            {info.getValue()}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('category_id', {
      header: t.col_category,
      cell: info => {
        const cat = catMap[info.getValue()]
        return <span style={{ color: 'rgba(240,240,255,0.75)' }}>{cat ? (isAr ? cat.name_ar : cat.name_en) : '—'}</span>
      }
    }),
    columnHelper.accessor('institution_id', {
      header: t.col_institution,
      cell: info => <span style={{ color: 'rgba(240,240,255,0.75)' }}>{instMap[info.getValue()]?.name || '—'}</span>
    }),
    columnHelper.accessor(row => {
      const inst = instMap[row.institution_id]
      if (!inst || !inst.region_id) return ''
      const reg = regMap[inst.region_id]
      return reg ? (isAr ? reg.name_ar : reg.name_en) : ''
    }, {
      id: 'region',
      header: t.col_region,
      cell: info => <span style={{ color: 'rgba(240,240,255,0.65)' }}>{info.getValue() || '—'}</span>
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
      cell: info => <span style={{ color: 'rgba(160,160,192,0.6)', fontSize: '0.8125rem' }}>{formatDate(info.getValue())}</span>
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
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
                  style={{ background: 'rgba(0,216,138,0.1)', border: '1px solid rgba(0,216,138,0.2)', color: '#00d88a' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,216,138,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0,216,138,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,216,138,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  title={t.approve}
                >
                  {isApproving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
                <button
                  onClick={() => { setRejectingId(s.id); resetReject() }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
                  style={{ background: 'rgba(245,107,126,0.1)', border: '1px solid rgba(245,107,126,0.2)', color: '#f56b7e' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,107,126,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(245,107,126,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,107,126,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  title={t.reject}
                >
                  <X size={13} />
                </button>
              </>
            )}
            <button
              onClick={() => { setReassigningId(s.id); setShowAgeWarning(false); resetReassign() }}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
              style={{ background: 'rgba(91,141,245,0.1)', border: '1px solid rgba(91,141,245,0.2)', color: '#5b8df5' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(91,141,245,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(91,141,245,0.3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(91,141,245,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
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
    <div className="animate-fade-slide-up">
      <PageHeader title={t.title} subtitle={`${totalStudents} total students`} />

      {/* Stats summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total',    value: totalStudents,    icon: <Users size={14} />,       color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.2)' },
          { label: 'Pending',  value: pendingStudents,  icon: <Clock size={14} />,       color: '#f0c060', bg: 'rgba(240,192,96,0.1)',   border: 'rgba(240,192,96,0.2)' },
          { label: 'Approved', value: approvedStudents, icon: <CheckCircle size={14} />, color: '#00d88a', bg: 'rgba(0,216,138,0.1)',    border: 'rgba(0,216,138,0.2)' },
          { label: 'Rejected', value: rejectedStudents, icon: <XCircle size={14} />,     color: '#f56b7e', bg: 'rgba(245,107,126,0.1)',  border: 'rgba(245,107,126,0.2)' },
        ].map(stat => (
          <div
            key={stat.label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
          >
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <div>
              <p className="text-xl font-bold" style={{ color: stat.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{stat.value}</p>
              <p className="text-xs font-semibold mt-0.5 uppercase tracking-wider" style={{ color: 'rgba(160,160,192,0.6)', fontFamily: 'var(--font-display)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: '14px', color: 'rgba(160,160,192,0.4)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder={t.search_placeholder}
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
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
                <tr>
                  <td colSpan={columns.length} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                        <Users size={20} style={{ color: '#a78bfa' }} />
                      </div>
                      <p style={{ color: 'rgba(160,160,192,0.5)', fontSize: '0.875rem' }}>No students found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="table-row-hover">
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
        <form onSubmit={handleReject(onRejectSubmit)} noValidate className="space-y-5">
          <div>
            <label className="label">{t.reject_reason_label}</label>
            <textarea
              {...regReject('rejection_reason')}
              rows={4}
              className="input-field resize-none"
            />
            {errReject.rejection_reason && <p className="error-text">Reason required (min 5 chars)</p>}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubReject} className="btn-danger flex-1">
              {isSubReject ? <><Loader2 size={15} className="animate-spin" /> Rejecting...</> : t.reject_confirm}
            </button>
            <button type="button" onClick={() => setRejectingId(null)} className="btn-ghost">
              {tc.cancel}
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
        <form onSubmit={handleReassign(onReassignSubmit)} noValidate className="space-y-5">
          <div>
            <label className="label">{t.reassign_label}</label>
            <select
              {...regReassign('category_id')}
              className="input-field"
              onChange={() => setShowAgeWarning(false)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>
              ))}
            </select>
          </div>
          {showAgeWarning && (
            <div
              className="rounded-xl p-4 flex items-start gap-3 text-sm"
              style={{ background: 'rgba(240,192,96,0.08)', border: '1px solid rgba(240,192,96,0.25)', color: '#f0c060' }}
            >
              <span className="text-base leading-none mt-0.5">⚠</span>
              <span>{t.reassign_age_warning}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={isSubReassign} className="btn-primary flex-1">
              {isSubReassign ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : t.reassign_confirm}
            </button>
            <button type="button" onClick={() => setReassigningId(null)} className="btn-ghost">
              {tc.cancel}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
