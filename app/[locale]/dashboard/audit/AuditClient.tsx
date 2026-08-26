'use client'

import { useState } from 'react'
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, flexRender, createColumnHelper, SortingState
} from '@tanstack/react-table'
import type { AuditLogEntry } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDateTime } from '@/lib/utils'
import { Filter, Search, Printer, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

export default function AuditClient({ initialData, dict, locale }: { initialData: AuditLogEntry[], dict: Dict, locale: string }) {
  const t = dict.audit
  const tc = dict.common
  const [data] = useState(initialData)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])

  const colHelper = createColumnHelper<AuditLogEntry>()
  const columns = [
    colHelper.accessor('created_at', { header: t.col_time, cell: info => <span className="text-gray-500 font-mono text-xs">{formatDateTime(info.getValue())}</span> }),
    colHelper.accessor('actor_id', { header: t.col_actor, cell: info => <span className="font-semibold text-gray-900 text-xs">{info.getValue() ? `User #${info.getValue()}` : 'System'}</span> }),
    colHelper.accessor('action', { header: t.col_action, cell: info => <span className="font-bold text-[#c99335] text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200">{info.getValue()}</span> }),
    colHelper.accessor('module', { header: t.col_module, cell: info => <span className="text-gray-700 text-xs font-medium">{info.getValue()}</span> }),
    colHelper.accessor('target_record_id', { header: t.col_target, cell: info => <span className="text-gray-500 text-xs font-mono">{info.getValue() ? `#${info.getValue()}` : '—'}</span> }),
    colHelper.accessor('ip_address', { header: t.col_ip, cell: info => <span className="text-gray-500 font-mono text-xs">{info.getValue() || '—'}</span> }),
  ]

  const table = useReactTable({
    data, columns, state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } }
  })

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t.title} 
        subtitle="Chronological system audit trail and staff security event logs"
        actions={
          <button onClick={() => window.print()} className="btn-secondary text-xs flex items-center gap-1.5">
            <Printer size={14} /> {t.print}
          </button>
        }
      />
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder={tc.search} value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <select className="input-field pl-9 pr-8 text-xs cursor-pointer" onChange={e => table.getColumn('action')?.setFilterValue(e.target.value || undefined)}>
              <option value="">{t.filter_action} ({tc.all})</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <select className="input-field pl-9 pr-8 text-xs cursor-pointer" onChange={e => table.getColumn('module')?.setFilterValue(e.target.value || undefined)}>
              <option value="">{t.filter_module} ({tc.all})</option>
              <option value="STUDENTS">STUDENTS</option>
              <option value="INSTITUTIONS">INSTITUTIONS</option>
              <option value="ROUNDS">ROUNDS</option>
              <option value="AUTH">AUTH</option>
            </select>
          </div>
        </div>
      </div>

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
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-12 text-sm">No audit logs found</td></tr>
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
        
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="text-xs text-gray-500 font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40 text-gray-600 cursor-pointer">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40 text-gray-600 cursor-pointer">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
