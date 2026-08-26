'use client'

import { useState, useEffect } from 'react'
import { getReportUrl, startBulkDossiers, getDossierJobStatus, type StudentRead, type BulkDossierJob } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { FileDown, Download, FolderArchive } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'

export default function ReportsClient({ students, dict, locale, token }: { students: StudentRead[], dict: Dict, locale: string, token: string }) {
  const t = dict.reports
  const tc = dict.common
  const [activeTab, setActiveTab] = useState<'excel' | 'dossier'>('excel')
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<BulkDossierJob | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (activeJobId && (!jobStatus || (jobStatus.status !== 'COMPLETED' && jobStatus.status !== 'FAILED'))) {
      const poll = async () => {
        try {
          const status = await getDossierJobStatus(token, activeJobId)
          setJobStatus(status)
          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            toast(status.status === 'COMPLETED' ? 'Dossier generation complete' : 'Dossier generation failed')
          }
        } catch {}
      }
      timer = setInterval(poll, 3000)
    }
    return () => clearInterval(timer)
  }, [activeJobId, jobStatus?.status, token])

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleGenerateDossiers = async () => {
    if (selectedStudents.length === 0) return
    try {
      const res = await startBulkDossiers(token, selectedStudents, locale.toUpperCase())
      setActiveJobId(res.job_id)
      setJobStatus({ job_id: res.job_id, status: res.status, total: res.total, completed: 0, failed: 0 })
      toast.success('Dossier job started')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleDownloadReport = (type: 'print-ready' | 'power-bi' | 'granular') => {
    toast.success('Initiating download...')
    window.open(getReportUrl(type), '_blank')
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.title} subtitle="Export datasets, generate student dossiers and competition sheets" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border ${
            activeTab === 'excel'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <FileDown size={14} /> {t.tab_excel}
        </button>
        <button
          onClick={() => setActiveTab('dossier')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border ${
            activeTab === 'dossier'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <FolderArchive size={14} /> {t.tab_dossier}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {activeTab === 'excel' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <FileDown size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-gray-900">{t.excel_power_bi}</h2>
                  <p className="text-gray-500 text-xs mt-1">A normalized, flattened dataset optimized for Power BI and Tableau ingestion.</p>
                </div>
              </div>
              <div className="pt-6">
                <button onClick={() => handleDownloadReport('power-bi')} className="btn-primary text-xs flex items-center gap-2">
                  <Download size={14} /> {t.excel_download}
                </button>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <FileDown size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-gray-900">{t.excel_granular}</h2>
                  <p className="text-gray-500 text-xs mt-1">Highly detailed export including every deduction event, timestamp, and panel member vote.</p>
                </div>
              </div>
              <div className="pt-6">
                <button onClick={() => handleDownloadReport('granular')} className="btn-primary text-xs flex items-center gap-2">
                  <Download size={14} /> {t.excel_download}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dossier' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-serif font-bold text-sm text-gray-900 mb-3">{t.dossier_select}</h2>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                <label className="flex items-center gap-3 p-3 bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selectedStudents.length === students.length && students.length > 0} onChange={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))} className="w-4 h-4 rounded border-gray-300" />
                  <span className="text-gray-900 font-bold text-xs">Select All ({students.length})</span>
                </label>
                {students.map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} className="w-4 h-4 rounded border-gray-300" />
                    <span className="text-gray-700 text-xs font-medium">{s.full_name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-5">
                <button onClick={handleGenerateDossiers} disabled={selectedStudents.length === 0 || (jobStatus?.status === 'PROCESSING')} className="btn-primary w-full text-xs flex items-center justify-center gap-2">
                  <FolderArchive size={14} /> {t.dossier_generate} ({selectedStudents.length})
                </button>
              </div>
            </div>

            {jobStatus && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif font-bold text-sm text-gray-900">{t.dossier_progress}</h2>
                  <div className="text-xs px-2 py-0.5 bg-gray-100 rounded font-semibold text-gray-700 uppercase tracking-wider">{jobStatus.status}</div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Processed</span>
                    <span className="font-bold text-gray-900">{jobStatus.completed + jobStatus.failed} / {jobStatus.total}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${jobStatus.status === 'FAILED' ? 'bg-rose-500' : 'bg-emerald-600'}`} 
                      style={{ width: `${jobStatus.total > 0 ? ((jobStatus.completed + jobStatus.failed) / jobStatus.total) * 100 : 0}%` }} 
                    />
                  </div>
                </div>

                {jobStatus.status === 'COMPLETED' && jobStatus.zip_url && (
                  <div className="pt-4 border-t border-gray-100 text-center">
                    <a href={jobStatus.zip_url} target="_blank" rel="noopener noreferrer" className="btn-gold w-full text-xs flex items-center justify-center gap-2">
                      <Download size={14} /> {t.dossier_download_zip}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
