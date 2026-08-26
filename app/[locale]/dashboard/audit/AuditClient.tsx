'use client'

import { useState } from 'react'
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, flexRender, createColumnHelper, SortingState
} from '@tanstack/react-table'
import type { AuditLogEntry } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDateTime } from '@/lib/utils'
import { Filter, Search, Printer, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AuditClient({ initialData, dict, locale }: { initialData: AuditLogEntry[], dict: Dict, locale: string }) {
  const t = dict.audit
  const tc = dict.common
  const [data] = useState(initialData)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])

  const colHelper = createColumnHelper<AuditLogEntry>()
  const columns = [
    colHelper.accessor('created_at', { header: t.col_time, cell: info => <span className="text-stone-400 font-mono text-xs">{formatDateTime(info.getValue())}</span> }),
    colHelper.accessor('actor_id', { header: t.col_actor, cell: info => info.getValue() ? `User #${info.getValue()}` : 'System' }),
    colHelper.accessor('action', { header: t.col_action, cell: info => <span className="font-medium text-amber-400">{info.getValue()}</span> }),
    colHelper.accessor('module', { header: t.col_module, cell: info => <span className="text-stone-300">{info.getValue()}</span> }),
    colHelper.accessor('target_record_id', { header: t.col_target, cell: info => info.getValue() ? `#${info.getValue()}` : '—' }),
    colHelper.accessor('ip_address', { header: t.col_ip, cell: info => <span className="text-stone-500 font-mono text-xs">{info.getValue() || '—'}</span> }),
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
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400">{t.title}</h1>
        <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2">
          <Printer size={16} /> {t.print}
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
          <input type="text" placeholder={tc.search} value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
            <select className="input-field pl-10 appearance-none bg-black/40 pr-8" onChange={e => table.getColumn('action')?.setFilterValue(e.target.value || undefined)}>
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
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
            <select className="input-field pl-10 appearance-none bg-black/40 pr-8" onChange={e => table.getColumn('module')?.setFilterValue(e.target.value || undefined)}>
              <option value="">{t.filter_module} ({tc.all})</option>
              <option value="STUDENTS">STUDENTS</option>
              <option value="INSTITUTIONS">INSTITUTIONS</option>
              <option value="ROUNDS">ROUNDS</option>
              <option value="AUTH">AUTH</option>
            </select>
          </div>
        </div>
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
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={6} className="table-td text-center text-stone-500 py-12">No audit logs found</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="table-row-hover border-b border-white/5 last:border-0">
                    {row.getVisibleCells().map(cell => <td key={cell.id} className="table-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <div className="text-sm text-stone-400">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 text-stone-300">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 text-stone-300">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
