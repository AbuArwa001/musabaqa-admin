'use client'

import { useState, useEffect } from 'react'
import { getReportUrl, startBulkDossiers, getDossierJobStatus, type StudentRead, type BulkDossierJob } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { FileDown, Download, FolderArchive, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

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
    // In a real app, we'd trigger a download using the token.
    // For demo, we just open the URL (requires backend to accept cookie or query param auth if GET)
    toast.success('Initiating download...')
    window.open(getReportUrl(type), '_blank')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400 mb-8">{t.title}</h1>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
        <button onClick={() => setActiveTab('excel')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'excel' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-stone-400 hover:text-white'}`}>
          <FileDown size={16} /> {t.tab_excel}
        </button>
        <button onClick={() => setActiveTab('dossier')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'dossier' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-stone-400 hover:text-white'}`}>
          <FolderArchive size={16} /> {t.tab_dossier}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {activeTab === 'excel' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass p-8 flex flex-col items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <FileDown size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{t.excel_power_bi}</h2>
                <p className="text-stone-400 text-sm">A normalized, flattened dataset optimized for Power BI and Tableau ingestion.</p>
              </div>
              <button onClick={() => handleDownloadReport('power-bi')} className="btn-primary mt-auto flex items-center gap-2">
                <Download size={16} /> {t.excel_download}
              </button>
            </div>
            
            <div className="glass p-8 flex flex-col items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileDown size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{t.excel_granular}</h2>
                <p className="text-stone-400 text-sm">Highly detailed export including every deduction event, timestamp, and panel member vote.</p>
              </div>
              <button onClick={() => handleDownloadReport('granular')} className="btn-primary mt-auto flex items-center gap-2">
                <Download size={16} /> {t.excel_download}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dossier' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass p-6">
              <h2 className="text-lg font-bold text-white mb-4">{t.dossier_select}</h2>
              <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-white/5 bg-black/20">
                  <input type="checkbox" checked={selectedStudents.length === students.length} onChange={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))} className="w-4 h-4 rounded border-white/20" />
                  <span className="text-white font-medium">Select All ({students.length})</span>
                </label>
                {students.map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent transition-colors">
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} className="w-4 h-4 rounded border-white/20" />
                    <span className="text-stone-300">{s.full_name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6">
                <button onClick={handleGenerateDossiers} disabled={selectedStudents.length === 0 || (jobStatus?.status === 'PROCESSING')} className="btn-primary w-full flex items-center justify-center gap-2">
                  <FolderArchive size={16} /> {t.dossier_generate} ({selectedStudents.length})
                </button>
              </div>
            </div>

            {jobStatus && (
              <div className="glass p-6 h-fit border-amber-500/20 shadow-[0_0_20px_rgba(201,147,53,0.05)]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">{t.dossier_progress}</h2>
                  <div className="text-xs px-2 py-1 bg-white/10 rounded text-stone-300 font-mono uppercase tracking-wider">{jobStatus.status}</div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Processed</span>
                    <span className="text-white font-medium">{jobStatus.completed + jobStatus.failed} / {jobStatus.total}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${jobStatus.status === 'FAILED' ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`} 
                      style={{ width: `${jobStatus.total > 0 ? ((jobStatus.completed + jobStatus.failed) / jobStatus.total) * 100 : 0}%` }} 
                    />
                  </div>
                </div>

                {jobStatus.status === 'COMPLETED' && jobStatus.zip_url && (
                  <div className="pt-4 border-t border-white/10 text-center">
                    <a href={jobStatus.zip_url} target="_blank" rel="noopener noreferrer" className="btn-gold w-full flex items-center justify-center gap-2">
                      <Download size={16} /> {t.dossier_download_zip}
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
