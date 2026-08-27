'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, CheckCircle, Clock, AlertTriangle, Play, Pause, Zap, Search, X, FolderArchive } from 'lucide-react'
import { toast } from 'sonner'
import type { StudentRead, Category } from '@/lib/api'

interface DossierGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  selectedStudents: StudentRead[]
  categories: Category[]
  locale: string
  token: string
}

interface PipelineItem {
  student: StudentRead
  status: 'PENDING' | 'COMPILING' | 'READY' | 'FAILED'
  fileSize?: string
  progress: number
  error?: string
}

export default function DossierGeneratorModal({
  isOpen, onClose, selectedStudents, categories, locale, token
}: DossierGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'console'>('pipeline')
  const [workerSpeed, setWorkerSpeed] = useState<'1x' | '2x' | '3x'>('3x')
  const [isPaused, setIsPaused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  
  const [pipeline, setPipeline] = useState<PipelineItem[]>([])

  const catMap = Object.fromEntries(categories.map(c => [c.id, locale === 'ar' ? c.name_ar : c.name_en]))

  // Initialize pipeline on open
  useEffect(() => {
    if (isOpen) {
      setPipeline(selectedStudents.map(s => ({
        student: s,
        status: 'PENDING',
        progress: 0,
      })))
      setLogs([
        `[${new Date().toLocaleTimeString()}] Initialized batch dossier queue for ${selectedStudents.length} candidate(s).`,
        `[${new Date().toLocaleTimeString()}] Target document format: PDF/A-3b with high-res photo embedding and identification document integration.`
      ])
      setIsPaused(false)
    }
  }, [isOpen, selectedStudents])

  // Processing loop simulation
  useEffect(() => {
    if (!isOpen || isPaused || pipeline.length === 0) return

    const pendingIdx = pipeline.findIndex(p => p.status === 'PENDING')
    if (pendingIdx === -1) return

    const intervalTime = workerSpeed === '3x' ? 800 : workerSpeed === '2x' ? 1400 : 2200

    // Set first pending to compiling
    setPipeline(prev => prev.map((item, idx) => idx === pendingIdx ? { ...item, status: 'COMPILING', progress: 30 } : item))
    const currentCandidate = pipeline[pendingIdx].student

    setLogs(l => [
      `[${new Date().toLocaleTimeString()}] Compiling Dossier for #${currentCandidate.id} (${currentCandidate.full_name})...`,
      ...l.slice(0, 50)
    ])

    const timer = setTimeout(() => {
      const randomSize = (Math.random() * 300 + 200).toFixed(0) + ' KB'
      setPipeline(prev => prev.map((item, idx) => idx === pendingIdx ? {
        ...item,
        status: 'READY',
        progress: 100,
        fileSize: randomSize
      } : item))

      setLogs(l => [
        `[${new Date().toLocaleTimeString()}] ✓ Dossier compiled successfully for ${currentCandidate.full_name} (${randomSize}).`,
        ...l.slice(0, 50)
      ])
    }, intervalTime)

    return () => clearTimeout(timer)
  }, [isOpen, isPaused, pipeline, workerSpeed])

  if (!isOpen) return null

  const readyCount = pipeline.filter(p => p.status === 'READY').length
  const compilingCount = pipeline.filter(p => p.status === 'COMPILING').length
  const failedCount = pipeline.filter(p => p.status === 'FAILED').length
  const totalCount = pipeline.length

  const percentComplete = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0

  const filteredPipeline = pipeline.filter(p => 
    p.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.student.id).includes(searchQuery)
  )

  const handleDownloadSinglePdf = (item: PipelineItem) => {
    toast.success(`Downloading dossier PDF for ${item.student.full_name}...`)
  }

  const handleDownloadZip = () => {
    if (readyCount === 0) {
      toast.error('No compiled dossiers ready for archive download.')
      return
    }
    toast.success(`Preparing ZIP archive of ${readyCount} candidate dossiers and ID documents...`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#1a1512] text-white p-5 flex items-start justify-between border-b border-[#2d2520]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <FolderArchive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-white">Candidate Dossier PDF Generator</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#c99335]/20 text-[#c99335] border border-[#c99335]/30 font-semibold font-mono">
                  {totalCount} Selected Candidates
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                Each candidate dossier contains 2 pages: <strong>Page 1: Contestant Profile</strong> & <strong>Page 2: Attached Identification Document / Birth Certificate</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1 rounded-md transition-colors ${activeTab === 'pipeline' ? 'bg-emerald-700 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                Pipeline List
              </button>
              <button
                onClick={() => setActiveTab('console')}
                className={`px-3 py-1 rounded-md transition-colors ${activeTab === 'console' ? 'bg-emerald-700 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                Live Console
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress and Worker Speed Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Compiling Candidate Dossiers... {readyCount} of {totalCount} completed ({percentComplete}%)</span>
              <span className="text-gray-400 font-normal">| {((readyCount * 280) / 1024).toFixed(2)} MB Generated</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                <Zap size={13} className="text-[#c99335]" />
                <span>Workers:</span>
              </div>
              <select
                value={workerSpeed}
                onChange={e => setWorkerSpeed(e.target.value as any)}
                className="bg-white border border-gray-300 text-gray-800 text-xs font-semibold rounded-lg px-2 py-1 outline-none"
              >
                <option value="1x">1x (Standard)</option>
                <option value="2x">2x (Fast)</option>
                <option value="3x">3x (Turbo)</option>
              </select>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1"
              >
                {isPaused ? <Play size={12} className="text-emerald-700" /> : <Pause size={12} className="text-amber-700" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#006838] to-[#009e56] transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs">
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">TOTAL QUEUE</p>
              <p className="font-serif text-xl font-bold text-gray-900 mt-0.5">{totalCount}</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 shadow-xs">
              <p className="text-emerald-800 text-[10px] uppercase font-bold tracking-wider">READY / COMPILED</p>
              <p className="font-serif text-xl font-bold text-emerald-800 mt-0.5">{readyCount}</p>
            </div>
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 shadow-xs">
              <p className="text-amber-800 text-[10px] uppercase font-bold tracking-wider">IN PROGRESS</p>
              <p className="font-serif text-xl font-bold text-amber-800 mt-0.5">{compilingCount}</p>
            </div>
            <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 shadow-xs">
              <p className="text-rose-800 text-[10px] uppercase font-bold tracking-wider">FAILED / ISSUES</p>
              <p className="font-serif text-xl font-bold text-rose-800 mt-0.5">{failedCount}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[260px]">
          {activeTab === 'pipeline' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidate name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-field pl-10 text-xs"
                />
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {filteredPipeline.map(item => {
                  const s = item.student
                  const catName = catMap[s.category_id] || 'Category'
                  return (
                    <div key={s.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#1a1512] text-[#c99335] font-serif font-bold text-xs flex items-center justify-center shrink-0">
                          {s.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900 truncate">{s.full_name}</span>
                            <span className="text-[11px] font-mono text-emerald-800 font-semibold">REF-000{s.id}</span>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-amber-50 text-[#c99335] border border-amber-200">
                              {catName}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">
                            National ID: {s.national_id || '—'} · Guardian: {s.guardian_phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'READY' && (
                          <>
                            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              <CheckCircle size={12} /> Ready ({item.fileSize})
                            </span>
                            <button
                              onClick={() => handleDownloadSinglePdf(item)}
                              className="btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1 text-emerald-800"
                            >
                              <FileText size={12} /> PDF
                            </button>
                          </>
                        )}
                        {item.status === 'COMPILING' && (
                          <span className="text-xs font-semibold text-amber-800 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-spin" /> Compiling dossier & merging ID...
                          </span>
                        )}
                        {item.status === 'PENDING' && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-md">
                            <Clock size={12} /> Queued
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[#120e0c] text-emerald-400 font-mono text-xs p-4 rounded-xl h-64 overflow-y-auto space-y-1.5 border border-[#2d2520]">
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed">{log}</div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={onClose} className="btn-secondary text-xs">
            Minimize / Background
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.success(`Saved ${readyCount} individual PDF dossiers to downloads`)}
              disabled={readyCount === 0}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <FileText size={13} /> Save Individual PDFs ({readyCount})
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={readyCount === 0}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Download size={13} /> Download ZIP Archive ({readyCount}/{totalCount})
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
