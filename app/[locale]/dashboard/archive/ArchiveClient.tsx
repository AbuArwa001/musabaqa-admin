'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, flexRender, createColumnHelper,
  SortingState
} from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  restoreStudent, permanentDeleteStudent, sendRegretEmail, bulkSendRegretEmails,
  updateArchivalReason, type StudentRead, type InstitutionRead, type Category, type Region
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDate } from '@/lib/utils'
import { Search, RotateCcw, Trash2, Mail, Edit3, X, Save, FileText, CheckCircle, Clock, AlertTriangle, ChevronDown, Sparkles } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

const PRESET_REASONS = [
  'County quota limit reached for this category.',
  'Age criteria not met for selected memorization category.',
  'Incomplete or unreadable identification documents.',
  'Duplicate registration entry detected.',
  'Registration withdrawn upon candidate/institution request.',
  'Eligibility criteria not fulfilled during verification review.',
]

export default function ArchiveClient({
  initialData, institutions = [], categories = [], regions = [], dict, locale, token
}: {
  initialData: StudentRead[]
  institutions?: InstitutionRead[]
  categories?: Category[]
  regions?: Region[]
  dict: Dict
  locale: string
  token: string
}) {
  const t = dict.archive
  const tc = dict.common
  const isAr = locale === 'ar'

  const [data, setData] = useState(initialData)
  const [globalFilter, setGlobalFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [regionFilter, setRegionFilter] = useState<string>('ALL')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [sorting, setSorting] = useState<SortingState>([{ id: 'archived_at', desc: true }])

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  
  // Archival Reason Edit State
  const [editingStudent, setEditingStudent] = useState<StudentRead | null>(null)
  const [newReason, setNewReason] = useState('')

  const instMap = useMemo(() => Object.fromEntries(institutions.map(i => [i.id, i])), [institutions])
  const catMap  = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const regMap  = useMemo(() => Object.fromEntries(regions.map(r => [r.id, r])), [regions])

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter(s => {
      if (categoryFilter !== 'ALL' && String(s.category_id) !== categoryFilter) return false
      if (regionFilter !== 'ALL') {
        const inst = instMap[s.institution_id]
        if (inst && String(inst.region_id) !== regionFilter) return false
      }
      return true
    })
  }, [data, categoryFilter, regionFilter, instMap])

  const handleOpenEditReason = (student: StudentRead) => {
    setEditingStudent(student)
    const currentReason = student.deletion_reason || student.rejection_reason || ''
    setNewReason(currentReason)
  }

  const handleSaveReason = async () => {
    if (!editingStudent) return
    try {
      const updated = await updateArchivalReason(token, editingStudent.id, newReason)
      setData(prev => prev.map(s => s.id === editingStudent.id ? updated : s))
      toast.success('Archival reason updated successfully')
      setEditingStudent(null)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update reason')
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await restoreStudent(token, id)
      setData(d => d.filter(s => s.id !== id))
      toast.success('Candidate restored to active registry')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handlePermanentDelete = async (id: number) => {
    try {
      await permanentDeleteStudent(token, id)
      setData(d => d.filter(s => s.id !== id))
      toast.success('Record permanently deleted')
      setConfirmDeleteId(null)
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleSendRegret = async (id: number) => {
    try {
      await sendRegretEmail(token, id)
      setData(d => d.map(s => s.id === id ? { ...s, regret_email_sent: true, regret_email_sent_at: new Date().toISOString() } : s))
      toast.success('Regret notification dispatched')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleBulkSendRegret = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id)
    if (selectedIds.length === 0) return
    try {
      await bulkSendRegretEmails(token, selectedIds)
      setData(d => d.map(s => selectedIds.includes(s.id) ? { ...s, regret_email_sent: true, regret_email_sent_at: new Date().toISOString() } : s))
      toast.success(`Dispatched regret emails to ${selectedIds.length} candidate(s)`)
      setRowSelection({})
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const colHelper = createColumnHelper<StudentRead>()
  const columns = useMemo(() => [
    colHelper.display({
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
      )
    }),
    colHelper.accessor('full_name', {
      header: 'CANDIDATE',
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="py-1">
            <Link
              href={`/${locale}/dashboard/students/${s.id}`}
              className="font-bold text-sm text-gray-900 hover:text-emerald-800 transition-colors uppercase block tracking-tight"
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
                  <span className="text-gray-400 font-mono text-[11px]">{s.email}</span>
                </>
              )}
            </div>
          </div>
        )
      }
    }),
    colHelper.accessor('category_id', {
      header: 'CATEGORY & LOCATION',
      cell: ({ row }) => {
        const s = row.original
        const cat = catMap[s.category_id]
        const inst = instMap[s.institution_id]
        const reg = inst && inst.region_id ? regMap[inst.region_id] : null
        return (
          <div>
            <p className="font-serif font-bold text-xs text-gray-900">
              {cat ? (isAr ? cat.name_ar : cat.name_en) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
              {inst?.name || '—'}
              {reg && <span className="text-gray-400"> ({isAr ? reg.name_ar : reg.name_en})</span>}
            </p>
          </div>
        )
      }
    }),
    colHelper.accessor(r => r.deletion_reason || r.rejection_reason || '—', {
      id: 'reason',
      header: 'ARCHIVAL REASON',
      cell: ({ row, getValue }) => {
        const s = row.original
        const reasonText = getValue() as string
        return (
          <div className="flex items-center justify-between gap-2 group max-w-xs">
            <span className="text-xs text-gray-700 leading-snug line-clamp-2" title={reasonText}>
              {reasonText}
            </span>
            <button
              onClick={() => handleOpenEditReason(s)}
              className="p-1 rounded-md text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer shrink-0"
              title="Edit Archival Reason"
            >
              <Edit3 size={13} />
            </button>
          </div>
        )
      }
    }),
    colHelper.accessor('regret_email_sent', {
      header: 'REGRET NOTIFICATION',
      cell: ({ row }) => {
        const isSent = row.original.regret_email_sent
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            isSent
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span>{isSent ? '✉️ Sent' : '⏳ Unsent'}</span>
          </span>
        )
      }
    }),
    colHelper.display({
      id: 'actions',
      header: 'ACTIONS',
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/${locale}/dashboard/students/${s.id}`}
              className="btn-secondary !py-1 !px-2.5 text-xs font-semibold text-sky-800 hover:bg-sky-50 border-sky-200"
            >
              Details
            </Link>
            <button
              onClick={() => handleOpenEditReason(s)}
              className="btn-secondary !py-1 !px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 border-amber-200 flex items-center gap-1 cursor-pointer"
            >
              <Edit3 size={11} /> Reason
            </button>
            <button
              onClick={() => handleRestore(s.id)}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
              title="Restore Candidate"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => handleSendRegret(s.id)}
              className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
              title="Send Regret Notification"
            >
              <Mail size={13} />
            </button>
            <button
              onClick={() => setConfirmDeleteId(s.id)}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              title="Permanently Delete Record"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      }
    })
  ], [locale, isAr, catMap, instMap, regMap])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, rowSelection, sorting },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Selected student's active region and category names
  const editingCategory = editingStudent ? catMap[editingStudent.category_id] : null
  const editingInstitution = editingStudent ? instMap[editingStudent.institution_id] : null
  const editingRegion = editingInstitution && editingInstitution.region_id ? regMap[editingInstitution.region_id] : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        subtitle="Manage deleted and rejected student applications, update archival reasons, and dispatch regret notifications"
      />
      
      {/* Stats KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-2xl font-bold font-serif text-gray-900">{data.length}</p>
          <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mt-1">{t.kpi_total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-2xl font-bold font-serif text-emerald-700">{data.filter(s => s.regret_email_sent).length}</p>
          <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mt-1">{t.kpi_regret_sent}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-2xl font-bold font-serif text-amber-700">{data.filter(s => !s.regret_email_sent).length}</p>
          <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mt-1">{t.kpi_regret_pending}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search deleted candidates by name, email, or REF code..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="input-field pl-10 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input-field text-xs !py-2 w-auto cursor-pointer font-medium"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={String(c.id)}>{isAr ? c.name_ar : c.name_en}</option>
            ))}
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="input-field text-xs !py-2 w-auto cursor-pointer font-medium"
          >
            <option value="ALL">Location: All Counties / Regions</option>
            {regions.map(r => (
              <option key={r.id} value={String(r.id)}>{isAr ? r.name_ar : r.name_en}</option>
            ))}
          </select>

          {Object.keys(rowSelection).length > 0 && (
            <button onClick={handleBulkSendRegret} className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 shrink-0">
              <Mail size={14} /> Send Regret ({Object.keys(rowSelection).length})
            </button>
          )}
        </div>
      </div>

      {/* Showing count indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
        <span>Showing <strong className="text-gray-900 font-bold">{filteredData.length}</strong> Archived Candidates</span>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className="table-th text-[11px]">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center py-12 text-gray-400 text-sm">No archived records found matching criteria</td></tr>
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

      {/* ─── EDIT ARCHIVAL REASON MODAL (Exact match to reference screenshot) ─── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            
            {/* Emerald Header Banner */}
            <div className="bg-gradient-to-r from-[#004d29] via-[#006838] to-[#004d29] p-5 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/90 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-white leading-tight">
                      Edit Archival Reason
                    </h2>
                    <p className="text-[11px] font-mono tracking-wider uppercase text-emerald-200/90 mt-0.5">
                      {editingStudent.full_name} • REF-000{editingStudent.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingStudent(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Candidate Info Summary Card */}
              <div className="bg-gray-50/90 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Category:</span>
                  <span className="font-bold text-gray-900">
                    {editingCategory ? (isAr ? editingCategory.name_ar : editingCategory.name_en) : '30 Juz\''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">County:</span>
                  <span className="font-bold text-gray-900">
                    {editingRegion ? (isAr ? editingRegion.name_ar : editingRegion.name_en) : editingStudent.residence || 'Nakuru'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Archived On:</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    <span>📦</span>
                    <span>{formatDate(editingStudent.archived_at || editingStudent.created_at)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Regret Email Status:</span>
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <span>{editingStudent.regret_email_sent ? '✉️ Sent' : '⏳ Not Yet Sent'}</span>
                  </span>
                </div>
              </div>

              {/* Quick Reason Presets */}
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2.5">
                  Quick Reason Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_REASONS.map(preset => {
                    const isSelected = newReason === preset
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewReason(preset)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer shadow-2xs text-left ${
                          isSelected
                            ? 'border-[#006838] bg-emerald-50 text-[#006838] font-bold ring-1 ring-[#006838]'
                            : 'border border-gray-200 hover:border-emerald-600 bg-white hover:bg-emerald-50/50 text-gray-700 hover:text-emerald-900 font-medium'
                        }`}
                      >
                        {preset}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Archival Reason Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">
                    Archival Reason / Committee Notes:
                  </label>
                  {newReason && (
                    <button
                      type="button"
                      onClick={() => setNewReason('')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  rows={4}
                  className="input-field text-xs resize-none leading-relaxed p-3"
                  placeholder="Enter specific justification, committee resolution, or reason for rejection/archival..."
                />
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                  <span className="text-gray-500 flex items-center gap-1">
                    💡 This note is displayed in the registry and included when dispatching regret emails.
                  </span>
                  <span className="font-mono shrink-0 ml-2">{newReason.length} chars</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReason}
                className="btn-primary !py-2 !px-6 text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Save size={14} />
                <span>Save Archival Reason</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirm Permanent Delete Modal */}
      <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title={t.confirm_permanent_title} variant="danger">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">{t.confirm_permanent_body}</p>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary">{tc.cancel}</button>
            <button onClick={() => confirmDeleteId && handlePermanentDelete(confirmDeleteId)} className="btn-primary !bg-rose-700 hover:!bg-rose-800">{t.confirm_permanent_button}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
