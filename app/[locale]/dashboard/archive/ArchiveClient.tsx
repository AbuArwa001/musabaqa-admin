'use client'

import { useState } from 'react'
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, flexRender, createColumnHelper,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  restoreStudent, permanentDeleteStudent, sendRegretEmail, bulkSendRegretEmails,
  updateArchivalReason, type StudentRead
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDate } from '@/lib/utils'
import { Search, RotateCcw, Trash2, Mail, Edit } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

export default function ArchiveClient({ initialData, dict, locale, token }: { initialData: StudentRead[], dict: Dict, locale: string, token: string }) {
  const t = dict.archive
  const tc = dict.common
  const [data, setData] = useState(initialData)
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [editReasonId, setEditReasonId] = useState<number | null>(null)
  const [newReason, setNewReason] = useState('')

  const handleRestore = async (id: number) => {
    try {
      await restoreStudent(token, id)
      setData(d => d.filter(s => s.id !== id))
      toast.success('Student restored')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handlePermanentDelete = async (id: number) => {
    try {
      await permanentDeleteStudent(token, id)
      setData(d => d.filter(s => s.id !== id))
      toast.success('Student permanently deleted')
      setConfirmDeleteId(null)
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleSendRegret = async (id: number) => {
    try {
      await sendRegretEmail(token, id)
      setData(d => d.map(s => s.id === id ? { ...s, regret_email_sent: true, regret_email_sent_at: new Date().toISOString() } : s))
      toast.success('Regret email sent')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleBulkSendRegret = async () => {
    const ids = table.getSelectedRowModel().rows.map(r => r.original.id)
    if (ids.length === 0) return
    try {
      await bulkSendRegretEmails(token, ids)
      setData(d => d.map(s => ids.includes(s.id) ? { ...s, regret_email_sent: true, regret_email_sent_at: new Date().toISOString() } : s))
      toast.success(`Sent ${ids.length} regret emails`)
      setRowSelection({})
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleEditReason = async () => {
    if (!editReasonId) return
    try {
      const updated = await updateArchivalReason(token, editReasonId, newReason)
      setData(d => d.map(s => s.id === editReasonId ? updated : s))
      toast.success('Reason updated')
      setEditReasonId(null)
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const colHelper = createColumnHelper<StudentRead>()
  const columns = [
    colHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
      )
    }),
    colHelper.accessor('full_name', { header: t.col_name, cell: info => <span className="font-semibold text-gray-900">{info.getValue()}</span> }),
    colHelper.accessor(r => r.deletion_reason || r.rejection_reason || '—', { 
      id: 'reason', header: t.col_reason, 
      cell: info => (
        <div className="flex items-center gap-2 group">
          <span className="text-gray-600 text-xs">{info.getValue()}</span>
          <button onClick={() => { setEditReasonId(info.row.original.id); setNewReason(info.getValue() === '—' ? '' : info.getValue()) }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 transition-opacity cursor-pointer">
            <Edit size={13} />
          </button>
        </div>
      )
    }),
    colHelper.accessor('regret_email_sent', {
      header: t.col_regret,
      cell: info => info.getValue() ? (
        <span className="badge-approved">{tc.yes}</span>
      ) : (
        <span className="badge-pending">{tc.no}</span>
      )
    }),
    colHelper.accessor(r => r.archived_at || r.created_at, { header: t.col_archived_at, cell: info => <span className="text-gray-500 text-xs">{formatDate(info.getValue())}</span> }),
    colHelper.display({
      id: 'actions', header: tc.actions,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleRestore(s.id)} className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer" title={t.restore}><RotateCcw size={13} /></button>
            <button onClick={() => handleSendRegret(s.id)} className="w-7 h-7 rounded-md flex items-center justify-center bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer" title={t.send_regret}><Mail size={13} /></button>
            <button onClick={() => setConfirmDeleteId(s.id)} className="w-7 h-7 rounded-md flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer" title={t.delete_permanent}><Trash2 size={13} /></button>
          </div>
        )
      }
    })
  ]

  const table = useReactTable({
    data, columns, state: { globalFilter, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-6">
      <PageHeader title={t.title} subtitle="Manage deleted and rejected student applications" />
      
      {/* Stats row */}
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

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder={tc.search} value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="input-field pl-10" />
        </div>
        {Object.keys(rowSelection).length > 0 && (
          <button onClick={handleBulkSendRegret} className="btn-primary flex items-center gap-2 shrink-0">
            <Mail size={16} /> {t.bulk_send_regret} ({Object.keys(rowSelection).length})
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => <th key={h.id} className="table-th">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center py-12 text-gray-400 text-sm">No archived records found</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    {row.getVisibleCells().map(cell => <td key={cell.id} className="table-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Reason Modal */}
      <Modal isOpen={!!editReasonId} onClose={() => setEditReasonId(null)} title={t.edit_reason}>
        <div className="space-y-4">
          <div>
            <label className="label">{t.edit_reason_label}</label>
            <textarea value={newReason} onChange={e => setNewReason(e.target.value)} rows={3} className="input-field resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setEditReasonId(null)} className="btn-secondary">{tc.cancel}</button>
            <button onClick={handleEditReason} className="btn-primary">{t.edit_reason_save}</button>
          </div>
        </div>
      </Modal>

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
