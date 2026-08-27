'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import JSZip from 'jszip'
import {
  FileText, Download, CheckCircle,
  Play, Pause, Zap, Search, X,
  RefreshCw, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { getStudentPdfUrl, type StudentRead, type Category } from '@/lib/api'

interface DossierGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  selectedStudents: StudentRead[]
  categories: Category[]
  locale: string
  token?: string
}

interface PipelineItem {
  student: StudentRead
  status: 'PENDING' | 'COMPILING' | 'READY' | 'FAILED'
  fileSizeBytes: number
  fileSizeStr: string
  progress: number
  error?: string
  startedAt?: number
  blob?: Blob | null
}

interface LogEntry {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'compiling'
}

type WorkerSpeed = '1x' | '2x' | '3x' | '5x'

export default function DossierGeneratorModal({
  isOpen, onClose, selectedStudents, categories, locale, token: _token
}: DossierGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'console'>('pipeline')
  const [workerSpeed, setWorkerSpeed] = useState<WorkerSpeed>('3x')
  const [isPaused, setIsPaused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pipeline, setPipeline] = useState<PipelineItem[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPackagingZip, setIsPackagingZip] = useState(false)

  const consoleEndRef = useRef<HTMLDivElement>(null)

  // Map category IDs to localized or standard category name
  const catMap = useMemo(() => {
    return Object.fromEntries(categories.map(c => [
      c.id,
      locale === 'ar' ? c.name_ar : c.name_en
    ]))
  }, [categories, locale])

  // Format current timestamp like [10:25:47 AM]
  const formatTime = useCallback(() => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }, [])

  // Helper to append logs
  const appendLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: formatTime(),
        message,
        type
      }
    ])
  }, [formatTime])

  // Fetch real certified candidate PDF dossier from backend
  const fetchCandidatePdfBlob = useCallback(async (student: StudentRead): Promise<Blob> => {
    const url = getStudentPdfUrl(student.id)
    const activeToken = _token || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '')
    const res = await fetch(url, {
      headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
    })
    if (!res.ok) {
      throw new Error(`PDF endpoint returned HTTP ${res.status}: ${res.statusText}`)
    }
    return await res.blob()
  }, [_token])

  // Initialize pipeline and logs when modal opens
  useEffect(() => {
    if (!isOpen) return

    const initialItems: PipelineItem[] = selectedStudents.map(s => ({
      student: s,
      status: 'PENDING',
      fileSizeBytes: 0,
      fileSizeStr: '',
      progress: 0,
      blob: null,
    }))

    const initialLogs: LogEntry[] = [
      {
        id: 'init-1',
        timestamp: formatTime(),
        message: `Initialized batch dossier compilation queue for ${selectedStudents.length} candidate(s).`,
        type: 'info'
      },
      {
        id: 'init-2',
        timestamp: formatTime(),
        message: `Connecting to Jamia Musabaqa PDF compiler (certified PDF dossier + ID document merge).`,
        type: 'info'
      }
    ]

    const timeout = setTimeout(() => {
      setPipeline(initialItems)
      setLogs(initialLogs)
      setIsPaused(false)
      setElapsedSeconds(0)
      setIsPackagingZip(false)
    }, 0)

    return () => clearTimeout(timeout)
  }, [isOpen, selectedStudents, formatTime])

  // Timer counter for elapsed seconds
  useEffect(() => {
    if (!isOpen || isPaused) return

    const allFinished = pipeline.length > 0 && pipeline.every(p => p.status === 'READY' || p.status === 'FAILED')
    if (allFinished) return

    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, isPaused, pipeline])

  // Auto-scroll console tab
  useEffect(() => {
    if (activeTab === 'console' && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, activeTab])

  // Concurrency limit mapped to worker speed
  const concurrencyLimit = workerSpeed === '5x' ? 5 : workerSpeed === '3x' ? 3 : workerSpeed === '2x' ? 2 : 1
  const compilationDelay = workerSpeed === '5x' ? 300 : workerSpeed === '3x' ? 600 : workerSpeed === '2x' ? 1000 : 1600

  // Multi-worker Concurrent Processing Engine
  useEffect(() => {
    if (!isOpen || isPaused || pipeline.length === 0) return

    const compilingCount = pipeline.filter(p => p.status === 'COMPILING').length
    const availableSlots = concurrencyLimit - compilingCount

    if (availableSlots <= 0) return

    // Find next pending items
    const pendingIndices: number[] = []
    for (let i = 0; i < pipeline.length && pendingIndices.length < availableSlots; i++) {
      if (pipeline[i].status === 'PENDING') {
        pendingIndices.push(i)
      }
    }

    if (pendingIndices.length === 0) return

    const timeout = setTimeout(() => {
      // Transition pending items to compiling
      setPipeline(prev => {
        const next = [...prev]
        pendingIndices.forEach(idx => {
          const item = next[idx]
          if (item && item.status === 'PENDING') {
            next[idx] = {
              ...item,
              status: 'COMPILING',
              progress: 40,
              startedAt: Date.now()
            }
            appendLog(`Compiling dossier for: ${item.student.full_name} (#${item.student.id})...`, 'compiling')
          }
        })
        return next
      })

      // Fetch real compiled PDF for each candidate
      pendingIndices.forEach(idx => {
        const candidate = pipeline[idx]?.student
        if (!candidate) return

        setTimeout(() => {
          fetchCandidatePdfBlob(candidate)
            .then((blob) => {
              setPipeline(prev => {
                const item = prev[idx]
                if (!item || item.status !== 'COMPILING') return prev

                const sizeInBytes = blob.size
                const sizeInMb = sizeInBytes / (1024 * 1024)
                const fileSizeStr = sizeInMb >= 0.1 ? `${sizeInMb.toFixed(2)} MB` : `${Math.round(sizeInBytes / 1024)} KB`

                const next = [...prev]
                next[idx] = {
                  ...item,
                  status: 'READY',
                  progress: 100,
                  fileSizeBytes: sizeInBytes,
                  fileSizeStr,
                  blob
                }

                appendLog(`✓ Finished certified dossier for ${candidate.full_name.toUpperCase()} (${fileSizeStr})`, 'success')
                return next
              })
            })
            .catch((err) => {
              console.error(`Failed to compile dossier for ${candidate.full_name}:`, err)
              setPipeline(prev => {
                const item = prev[idx]
                if (!item || item.status !== 'COMPILING') return prev

                const next = [...prev]
                next[idx] = {
                  ...item,
                  status: 'FAILED',
                  progress: 0,
                  error: err.message || 'Compilation error'
                }

                appendLog(`✗ Error compiling dossier for ${candidate.full_name.toUpperCase()}: ${err.message}`, 'error')
                return next
              })
            })
        }, compilationDelay)
      })
    }, 40)

    return () => clearTimeout(timeout)
  }, [isOpen, isPaused, pipeline, concurrencyLimit, compilationDelay, appendLog, fetchCandidatePdfBlob])

  if (!isOpen) return null

  const readyCount = pipeline.filter(p => p.status === 'READY').length
  const compilingCount = pipeline.filter(p => p.status === 'COMPILING').length
  const failedCount = pipeline.filter(p => p.status === 'FAILED').length
  const totalCount = pipeline.length

  const percentComplete = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0

  const totalBytesGenerated = pipeline
    .filter(p => p.status === 'READY')
    .reduce((acc, curr) => acc + curr.fileSizeBytes, 0)
  const totalMbGenerated = (totalBytesGenerated / (1024 * 1024)).toFixed(2)

  // Filter pipeline items based on search input
  const filteredPipeline = pipeline.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.student.full_name.toLowerCase().includes(q) ||
      String(p.student.id).includes(q) ||
      (p.student.national_id && p.student.national_id.toLowerCase().includes(q)) ||
      (p.student.residence && p.student.residence.toLowerCase().includes(q))
    )
  })

  // Retry an item
  const handleRetryItem = (studentId: number) => {
    setPipeline(prev => prev.map(item => {
      if (item.student.id === studentId) {
        appendLog(`Retrying dossier compilation for #${studentId} (${item.student.full_name})...`, 'info')
        return {
          ...item,
          status: 'PENDING',
          progress: 0,
          error: undefined
        }
      }
      return item
    }))
  }

  // Trigger individual PDF download using the candidate blob
  const handleDownloadSinglePdf = async (item: PipelineItem) => {
    const student = item.student
    let blob = item.blob
    if (!blob) {
      try {
        toast.info(`Fetching certified dossier PDF for ${student.full_name}...`)
        blob = await fetchCandidatePdfBlob(student)
      } catch (err: any) {
        toast.error(`Failed to download dossier for ${student.full_name}: ${err.message}`)
        return
      }
    }
    const cleanName = student.full_name.trim().replace(/\s+/g, '_')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `REF_${String(student.id).padStart(5, '0')}_${cleanName}_Dossier.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Dossier PDF downloaded for ${student.full_name}`)
  }

  // Save all ready individual PDFs
  const handleSaveIndividualPdfs = () => {
    const readyItems = pipeline.filter(p => p.status === 'READY')
    if (readyItems.length === 0) {
      toast.error('No compiled dossiers ready yet.')
      return
    }

    readyItems.slice(0, 5).forEach((item, index) => {
      setTimeout(() => {
        handleDownloadSinglePdf(item)
      }, index * 250)
    })

    if (readyItems.length > 5) {
      toast.info(`Downloaded first 5 candidate PDFs. Use 'Download ZIP Archive' for the complete batch of ${readyItems.length}.`)
    } else {
      toast.success(`Exported ${readyItems.length} individual candidate dossier PDFs.`)
    }
  }

  // Download real ZIP Archive of all dossiers using JSZip
  const handleDownloadZipArchive = async () => {
    const readyItems = pipeline.filter(p => p.status === 'READY' && p.blob)
    if (readyItems.length === 0) {
      toast.error('No compiled dossiers ready for archive download.')
      return
    }

    setIsPackagingZip(true)
    toast.info(`Packaging ${readyItems.length} certified candidate dossier PDFs into ZIP archive...`)

    try {
      const zip = new JSZip()
      const folder = zip.folder(`Musabaqa_Dossiers_2026`) || zip

      readyItems.forEach(item => {
        const student = item.student
        const cleanName = student.full_name.trim().replace(/\s+/g, '_')
        const filename = `REF_${String(student.id).padStart(5, '0')}_${cleanName}_Dossier.pdf`
        if (item.blob) {
          folder.file(filename, item.blob)
        }
      })

      // Add archive manifest
      const manifest = {
        archive_title: 'Official_Musabaqa_Candidate_Dossiers_2026',
        institution: 'Jamia Mosque Committee · Nairobi, Kenya',
        competition: 'Quran Memorization Competition 2026',
        generated_at: new Date().toISOString(),
        total_candidates: readyItems.length,
        candidates: readyItems.map(item => ({
          ref_id: `REF-${String(item.student.id).padStart(5, '0')}`,
          name: item.student.full_name,
          category_id: item.student.category_id,
          national_id: item.student.national_id,
          file_size: item.fileSizeStr,
          status: item.student.review_status
        }))
      }
      folder.file('MANIFEST.json', JSON.stringify(manifest, null, 2))

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      const zipUrl = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = zipUrl
      a.download = `Musabaqa_Candidate_Dossiers_${readyItems.length}_Candidates.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(zipUrl)

      toast.success(`ZIP Archive generated and downloaded successfully!`)
      appendLog(`✓ Downloaded ZIP archive containing ${readyItems.length} candidate dossiers.`, 'success')
    } catch (err: any) {
      console.error('ZIP generation error:', err)
      toast.error(`Failed to package ZIP archive: ${err.message}`)
      appendLog(`✗ ZIP packaging error: ${err.message}`, 'error')
    } finally {
      setIsPackagingZip(false)
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Modal Shell Container */}
      <div className="bg-[#0b1017] text-slate-100 border border-emerald-500/25 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.12)] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ─── 1. Header Row ──────────────────────────────────────────────────────── */}
        <div className="bg-[#0c131d] px-5 py-4 sm:px-6 sm:py-5 flex items-start justify-between border-b border-slate-800/90 relative">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Green Icon Box */}
            <div className="w-11 h-11 rounded-xl bg-emerald-600/90 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/60 border border-emerald-400/30 mt-0.5">
              <FileText size={22} className="stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                  Candidate Dossier PDF Generator
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                  {totalCount} Selected
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Real-time official dossier compilation with high-res photo embedding &amp; national ID integration
              </p>
            </div>
          </div>

          {/* Top-Right Controls: Pipeline / Console Tabs & Close Button */}
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <div className="flex bg-[#070b12] rounded-xl p-1 border border-slate-800/90 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>📋</span>
                <span>Pipeline List</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('console')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'console'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Zap size={13} className={activeTab === 'console' ? 'text-amber-300 fill-amber-300' : 'text-amber-400'} />
                <span>Live Console</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700/60 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ─── 2. Progress & Status Banner + Worker Control ───────────────────────── */}
        <div className="bg-[#090e16] border-b border-slate-800/80 px-5 py-3.5 sm:px-6 sm:py-4 space-y-3">
          
          {/* Status Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-300">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <RefreshCw size={13} className="text-teal-400 animate-spin" />
                <span>Compiling Candidate Dossiers...</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-medium">
                {readyCount} of {totalCount} completed ({percentComplete}%)
              </span>
              <span className="bg-emerald-950/90 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono font-semibold text-[11px]">
                {totalMbGenerated} MB Generated
              </span>
              <span className="text-slate-400 font-mono flex items-center gap-1">
                <span>⏱</span> {elapsedSeconds}s elapsed
              </span>
            </div>

            {/* Workers Speed Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 text-xs font-medium">Workers:</span>
              <select
                value={workerSpeed}
                onChange={e => setWorkerSpeed(e.target.value as WorkerSpeed)}
                className="!bg-[#0e1622] !text-white !border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 outline-none border focus:!border-emerald-500 cursor-pointer"
              >
                <option value="1x" className="!bg-[#0e1622] !text-white">1x (Standard)</option>
                <option value="2x" className="!bg-[#0e1622] !text-white">2x (Normal)</option>
                <option value="3x" className="!bg-[#0e1622] !text-white">3x (Fast)</option>
                <option value="5x" className="!bg-[#0e1622] !text-white">5x (Turbo)</option>
              </select>
            </div>
          </div>

          {/* Dual-Color Gradient Progress Bar */}
          <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
              style={{ width: `${percentComplete}%` }}
            />
          </div>

          {/* KPI 4-Card Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
            <div className="bg-[#0f1722] border border-slate-800 rounded-xl p-3 shadow-inner">
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider font-mono">TOTAL QUEUE</p>
              <p className="font-mono text-2xl font-bold text-white mt-0.5 tracking-tight">{totalCount}</p>
            </div>

            <div className="bg-[#0f1722] border border-emerald-900/40 rounded-xl p-3 shadow-inner">
              <p className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider font-mono">READY / COMPILED</p>
              <p className="font-mono text-2xl font-bold text-emerald-400 mt-0.5 tracking-tight">{readyCount}</p>
            </div>

            <div className="bg-[#0f1722] border border-amber-900/40 rounded-xl p-3 shadow-inner">
              <p className="text-amber-400 text-[10px] uppercase font-bold tracking-wider font-mono">IN PROGRESS</p>
              <p className="font-mono text-2xl font-bold text-amber-400 mt-0.5 tracking-tight">{compilingCount}</p>
            </div>

            <div className="bg-[#0f1722] border border-rose-900/40 rounded-xl p-3 shadow-inner">
              <p className="text-rose-500 text-[10px] uppercase font-bold tracking-wider font-mono">FAILED / ISSUES</p>
              <p className="font-mono text-2xl font-bold text-rose-500 mt-0.5 tracking-tight">{failedCount}</p>
            </div>
          </div>
        </div>

        {/* ─── 3. Search & Queue Controls Bar ────────────────────────────────────── */}
        <div className="px-5 py-2.5 sm:px-6 bg-[#0a0f18] border-b border-slate-800/70 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search candidate name, ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="!bg-[#0e1622] !text-white !border-slate-800 placeholder:text-slate-500 text-xs rounded-xl pl-9 pr-3 py-1.5 w-full border focus:!border-emerald-500/60 outline-none transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="bg-[#0f1722] hover:bg-slate-800 text-white border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            {isPaused ? (
              <>
                <Play size={12} className="text-emerald-400 fill-emerald-400" />
                <span>Resume Queue</span>
              </>
            ) : (
              <>
                <Pause size={12} className="text-amber-400 fill-amber-400" />
                <span>Pause Queue</span>
              </>
            )}
          </button>
        </div>

        {/* ─── 4. Main Body: Pipeline List OR Live Console ───────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#070b12] min-h-[290px] max-h-[340px]">
          {activeTab === 'pipeline' ? (
            <div className="space-y-2.5">
              {filteredPipeline.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No candidates found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredPipeline.map(item => {
                  const s = item.student
                  const catName = catMap[s.category_id] || (s.category_id === 1 ? "15 Juz'" : s.category_id === 2 ? "20 Juz'" : "30 Juz'")
                  const initial = (s.full_name || 'C').charAt(0).toUpperCase()
                  const residence = s.residence || 'Mombasa'

                  return (
                    <div
                      key={s.id}
                      className="bg-[#0e1622] hover:bg-[#121c2b] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
                    >
                      {/* Left: Avatar & Candidate Information */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#172130] border border-slate-700/80 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {initial}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white tracking-wide truncate max-w-[200px] sm:max-w-xs">
                              {s.full_name}
                            </span>
                            <span className="text-slate-400 text-xs font-mono font-medium">
                              #{s.id}
                            </span>
                            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                              {catName}
                            </span>
                          </div>

                          <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
                            <span>{residence}</span>
                            <span>•</span>
                            {item.status === 'READY' && (
                              <span className="text-emerald-400">Ready ({item.fileSizeStr})</span>
                            )}
                            {item.status === 'COMPILING' && (
                              <span className="text-amber-300 animate-pulse">Generating PDF pages (Page 1/2)...</span>
                            )}
                            {item.status === 'PENDING' && (
                              <span className="text-slate-400">Queued for compilation...</span>
                            )}
                            {item.status === 'FAILED' && (
                              <span className="text-rose-400">Compilation failed</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right: Status Pill Badge / Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'READY' && (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <CheckCircle size={12} className="text-emerald-400" />
                              <span>Ready</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownloadSinglePdf(item)}
                              className="bg-[#172130] hover:bg-[#1f2d42] text-slate-300 hover:text-white border border-slate-700/80 px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              <Download size={11} />
                            </button>
                          </div>
                        )}

                        {item.status === 'COMPILING' && (
                          <span className="bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <RefreshCw size={12} className="text-amber-400 animate-spin" />
                            <span>Compiling...</span>
                          </span>
                        )}

                        {item.status === 'PENDING' && (
                          <span className="bg-[#131c2a] border border-slate-700/80 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <span className="text-amber-400">⏳</span>
                            <span>Queued</span>
                          </span>
                        )}

                        {item.status === 'FAILED' && (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <AlertTriangle size={12} className="text-rose-400" />
                              <span>Failed</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRetryItem(s.id)}
                              className="bg-[#7f1d1d] hover:bg-[#991b1b] text-rose-200 border border-rose-800 text-xs px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            /* Live Terminal Console View */
            <div className="bg-[#05080e] border border-slate-800/80 rounded-xl p-4 font-mono text-xs h-[290px] overflow-y-auto space-y-2 select-text">
              {logs.map(log => (
                <div key={log.id} className="leading-relaxed flex items-start gap-2">
                  <span className="text-slate-500 select-none shrink-0">[{log.timestamp}]</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400 font-medium'
                        : log.type === 'compiling'
                        ? 'text-slate-300'
                        : log.type === 'error'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          )}
        </div>

        {/* ─── 5. Modal Footer Action Bar ────────────────────────────────────────── */}
        <div className="bg-[#080d14] border-t border-slate-800/80 px-5 py-3.5 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#101724] hover:bg-[#162132] text-slate-300 hover:text-white border border-slate-700/80 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Minimize / Background
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveIndividualPdfs}
              disabled={readyCount === 0}
              className="bg-[#171411] hover:bg-[#221c17] border border-amber-900/50 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>📥</span>
              <span>Save Individual PDFs ({readyCount})</span>
            </button>

            <button
              type="button"
              disabled={readyCount === 0 || isPackagingZip}
              onClick={handleDownloadZipArchive}
              className="bg-gradient-to-r from-[#00874c] to-[#00ab61] hover:from-[#009b57] hover:to-[#00bd6c] text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPackagingZip ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-white" />
                  <span>Packaging ZIP...</span>
                </>
              ) : (
                <>
                  <span>📦</span>
                  <span>Download ZIP Archive ({readyCount}/{totalCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
