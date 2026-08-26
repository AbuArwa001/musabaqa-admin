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
        <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} className="w-4 h-4 rounded border-white/20" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="w-4 h-4 rounded border-white/20" />
      )
    }),
    colHelper.accessor('full_name', { header: t.col_name, cell: info => <span className="font-medium text-white">{info.getValue()}</span> }),
    colHelper.accessor(r => r.deletion_reason || r.rejection_reason || '—', { 
      id: 'reason', header: t.col_reason, 
      cell: info => (
        <div className="flex items-center gap-2 group">
          <span>{info.getValue()}</span>
          <button onClick={() => { setEditReasonId(info.row.original.id); setNewReason(info.getValue() === '—' ? '' : info.getValue()) }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-white transition-opacity">
            <Edit size={14} />
          </button>
        </div>
      )
    }),
    colHelper.accessor('regret_email_sent', {
      header: t.col_regret,
      cell: info => info.getValue() ? (
        <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-500/10 rounded-full">{tc.yes}</span>
      ) : (
        <span className="text-amber-400 text-xs px-2 py-1 bg-amber-500/10 rounded-full">{tc.no}</span>
      )
    }),
    colHelper.accessor(r => r.archived_at || r.created_at, { header: t.col_archived_at, cell: info => formatDate(info.getValue()) }),
    colHelper.display({
      id: 'actions', header: tc.actions,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => handleRestore(s.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title={t.restore}><RotateCcw size={15} /></button>
            <button onClick={() => handleSendRegret(s.id)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title={t.send_regret}><Mail size={15} /></button>
            <button onClick={() => setConfirmDeleteId(s.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title={t.delete_permanent}><Trash2 size={15} /></button>
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
    <div>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400 mb-8">{t.title}</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="kpi-card shadow-[0_0_20px_rgba(255,255,255,0.05)]">
          <p className="text-3xl font-bold text-white">{data.length}</p>
          <p className="text-stone-400 text-sm">{t.kpi_total}</p>
        </div>
        <div className="kpi-card shadow-[0_0_20px_rgba(16,185,129,0.05)] border-emerald-500/20">
          <p className="text-3xl font-bold text-emerald-400">{data.filter(s => s.regret_email_sent).length}</p>
          <p className="text-emerald-500/70 text-sm">{t.kpi_regret_sent}</p>
        </div>
        <div className="kpi-card shadow-[0_0_20px_rgba(245,158,11,0.05)] border-amber-500/20">
          <p className="text-3xl font-bold text-amber-400">{data.filter(s => !s.regret_email_sent).length}</p>
          <p className="text-amber-500/70 text-sm">{t.kpi_regret_pending}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
          <input type="text" placeholder={tc.search} value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="input-field pl-10" />
        </div>
        {Object.keys(rowSelection).length > 0 && (
          <button onClick={handleBulkSendRegret} className="btn-primary flex items-center gap-2 shrink-0">
            <Mail size={16} /> {t.bulk_send_regret} ({Object.keys(rowSelection).length})
          </button>
        )}
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-black/20">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => <th key={h.id} className="table-th">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="table-row-hover border-b border-white/5 last:border-0">
                  {row.getVisibleCells().map(cell => <td key={cell.id} className="table-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editReasonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-6">{t.edit_reason}</h2>
            <div className="space-y-4">
              <div>
                <label className="label">{t.edit_reason_label}</label>
                <textarea value={newReason} onChange={e => setNewReason(e.target.value)} rows={3} className="input-field resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleEditReason} className="btn-primary flex-1">{t.edit_reason_save}</button>
                <button onClick={() => setEditReasonId(null)} className="btn-ghost">{tc.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass p-8 w-full max-w-md border-red-500/30">
            <h2 className="text-xl font-bold text-white mb-2">{t.confirm_permanent_title}</h2>
            <p className="text-stone-400 text-sm mb-6">{t.confirm_permanent_body}</p>
            <div className="flex gap-3">
              <button onClick={() => handlePermanentDelete(confirmDeleteId)} className="btn-danger flex-1">{t.confirm_permanent_button}</button>
              <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost">{tc.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
