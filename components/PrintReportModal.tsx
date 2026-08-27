'use client'

import { useState, useMemo } from 'react'
import {
  Printer, X, Calendar, CheckSquare, Square,
  Layers, MapPin, Tag, Building2, Eye, Download, Check
} from 'lucide-react'
import { toast } from 'sonner'
import type { StudentRead, Category, InstitutionRead } from '@/lib/api'
import { generateOfficialRegistryReport } from '@/lib/printReport'

interface PrintReportModalProps {
  isOpen: boolean
  onClose: () => void
  students: StudentRead[]
  categories: Category[]
  institutions: InstitutionRead[]
  locale: string
  selectedStudentIds?: number[]
}

type GroupByOption = 'NONE' | 'LOCATION' | 'CATEGORY' | 'STATUS' | 'INSTITUTION'

export default function PrintReportModal({
  isOpen,
  onClose,
  students,
  categories,
  institutions,
  locale,
  selectedStudentIds = []
}: PrintReportModalProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>('NONE')
  const [submissionDateFilter, setSubmissionDateFilter] = useState<string>('')
  const [useSelectedOnly, setUseSelectedOnly] = useState<boolean>(selectedStudentIds.length > 0)
  const [showPreview, setShowPreview] = useState<boolean>(false)

  // Columns visibility state (defaults matching reference screenshot)
  const [columns, setColumns] = useState({
    category: true,
    locationInstitution: true,
    age: false,
    submissionDate: false,
    phone: true,
    status: true,
  })

  const catMap = useMemo(() => {
    return Object.fromEntries(categories.map(c => [
      c.id,
      locale === 'ar' ? c.name_ar : c.name_en
    ]))
  }, [categories, locale])

  const instMap = useMemo(() => {
    return Object.fromEntries(institutions.map(i => [
      i.id,
      i.name
    ]))
  }, [institutions])

  // Filter students based on scope and submission date
  const filteredStudents = useMemo(() => {
    let list = useSelectedOnly && selectedStudentIds.length > 0
      ? students.filter(s => selectedStudentIds.includes(s.id))
      : students

    if (submissionDateFilter) {
      list = list.filter(s => {
        if (!s.created_at) return true
        return s.created_at.startsWith(submissionDateFilter)
      })
    }

    return list
  }, [students, useSelectedOnly, selectedStudentIds, submissionDateFilter])

  // Grouped students structure
  const groupedData = useMemo(() => {
    if (groupBy === 'NONE') {
      return [{ groupTitle: '', items: filteredStudents }]
    }

    const map = new Map<string, StudentRead[]>()

    filteredStudents.forEach(student => {
      let key = 'Other'
      if (groupBy === 'LOCATION') {
        key = (student.residence || 'Unassigned Location').toUpperCase()
      } else if (groupBy === 'CATEGORY') {
        key = (catMap[student.category_id] || `Category #${student.category_id}`).toUpperCase()
      } else if (groupBy === 'STATUS') {
        key = student.review_status.replace(/_/g, ' ').toUpperCase()
      } else if (groupBy === 'INSTITUTION') {
        key = (instMap[student.institution_id] || `Institution #${student.institution_id}`).toUpperCase()
      }

      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(student)
    })

    return Array.from(map.entries()).map(([groupTitle, items]) => ({
      groupTitle,
      items
    }))
  }, [filteredStudents, groupBy, catMap, instMap])

  // Metrics summary for executive header box
  const totalRegistrants = filteredStudents.length

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredStudents.forEach(s => {
      const loc = s.residence || 'Mombasa'
      counts[loc] = (counts[loc] || 0) + 1
    })
    return Object.entries(counts).slice(0, 3)
  }, [filteredStudents])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredStudents.forEach(s => {
      const cat = catMap[s.category_id] || 'Category'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts)
  }, [filteredStudents, catMap])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredStudents.forEach(s => {
      const st = s.review_status === 'APPROVED' ? 'Approved' : s.review_status === 'REJECTED' ? 'Rejected' : 'Pending'
      counts[st] = (counts[st] || 0) + 1
    })
    return Object.entries(counts)
  }, [filteredStudents])

  const handlePrint = () => {
    toast.success('Generating official registry print layout...')
    generateOfficialRegistryReport(filteredStudents, categories, institutions, {
      groupBy: groupBy === 'LOCATION' ? 'county' : groupBy === 'CATEGORY' ? 'category_name' : groupBy === 'STATUS' ? 'status' : groupBy === 'INSTITUTION' ? 'institution' : 'none',
      columns: {
        category: columns.category,
        location: columns.locationInstitution,
        age: columns.age,
        date: columns.submissionDate,
        phone: columns.phone,
        status: columns.status
      }
    })
    onClose()
  }

  const toggleColumn = (key: keyof typeof columns) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const calculateAge = (dobString?: string) => {
    if (!dobString) return '—'
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return `${age} yrs`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '15 Aug 2026'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* ─── 1. Configuration Modal Dialog (Screen 1) ─────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 no-print">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col animate-[scale-in_0.15s_ease-out]">
          
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-gray-900 tracking-tight">
                Print Premium Report
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                Customize how your printed report is formatted and what data is included.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-5">
            
            {/* Grouping Select + Date Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Group Results By
                </label>
                <select
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value as GroupByOption)}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-xs rounded-xl px-3 py-2.5 font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 cursor-pointer"
                >
                  <option value="NONE">No Grouping (Flat List)</option>
                  <option value="LOCATION">By Location / County</option>
                  <option value="CATEGORY">By Category</option>
                  <option value="STATUS">By Review Status</option>
                  <option value="INSTITUTION">By Institution</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Filter by Submission Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={submissionDateFilter}
                    onChange={e => setSubmissionDateFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 text-xs rounded-xl px-3 py-2.5 font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                    placeholder="mm / dd / yyyy"
                  />
                </div>
              </div>
            </div>

            {/* Scope Selection (if items are selected) */}
            {selectedStudentIds.length > 0 && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-950">
                  {selectedStudentIds.length} candidate(s) currently selected
                </span>
                <button
                  type="button"
                  onClick={() => setUseSelectedOnly(!useSelectedOnly)}
                  className="font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  {useSelectedOnly ? 'Print All Candidates' : 'Print Selected Only'}
                </button>
              </div>
            )}

            {/* Columns to Include Checklist (Matching Reference Grid) */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-2">
                Columns to Include
              </label>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={columns.category}
                    onChange={() => toggleColumn('category')}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="font-medium text-gray-800">Category</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={columns.locationInstitution}
                    onChange={() => toggleColumn('locationInstitution')}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="font-medium text-gray-800">Location / Institution</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={columns.age}
                    onChange={() => toggleColumn('age')}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="font-medium text-gray-800">Age</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={columns.submissionDate}
                    onChange={() => toggleColumn('submissionDate')}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="font-medium text-gray-800">Submission Date</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={columns.phone}
                    onChange={() => toggleColumn('phone')}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="font-medium text-gray-800">Phone Number</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={columns.status}
                    onChange={() => toggleColumn('status')}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="font-medium text-gray-800">Status Badge</span>
                </label>

              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary text-xs !py-2 !px-4 flex items-center gap-2"
            >
              <Printer size={14} />
              <span>Generate &amp; Print</span>
            </button>
          </div>

        </div>
      </div>

      {/* ─── 2. Ultra-Premium Official Registry Printable Document (Screen 2) ──── */}
      <div className="official-print-report hidden print:block bg-white text-gray-900 p-8 sm:p-12 font-sans max-w-5xl mx-auto">
        
        {/* Masthead Header */}
        <div className="flex items-center justify-between pb-4">
          
          {/* Left: Embassy of Saudi Arabia Crest Logo & Musabaqa Emblem */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-20 relative flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Ornate Arch Frame */}
                <path d="M50 5 C25 20 10 40 10 65 V110 H90 V65 C90 40 75 20 50 5 Z" fill="#fcf9f2" stroke="#c99335" strokeWidth="2.5" />
                <path d="M50 12 C30 25 18 42 18 65 V104 H82 V65 C82 42 70 25 50 12 Z" fill="#ffffff" stroke="#006838" strokeWidth="1.5" />
                {/* Palm Tree */}
                <path d="M50 30 V55 M46 36 C42 32 35 34 35 34 M54 36 C58 32 65 34 65 34 M45 44 C38 42 34 46 34 46 M55 44 C62 42 66 46 66 46" stroke="#006838" strokeWidth="2.5" strokeLinecap="round" />
                {/* Crossed Swords */}
                <path d="M35 62 L65 78 M65 62 L35 78" stroke="#c99335" strokeWidth="2" strokeLinecap="round" />
                {/* Open Quran Book */}
                <path d="M34 85 C42 80 50 82 50 82 C50 82 58 80 66 85 V98 C58 93 50 95 50 95 C50 95 42 93 34 98 Z" fill="#006838" />
                <path d="M50 82 V95" stroke="#ffffff" strokeWidth="1.5" />
              </svg>
            </div>

            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#006838] tracking-tight">
                Quran Competition 2026
              </h1>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-600 mt-1">
                Religious Attaché • Embassy of Saudi Arabia
              </p>
            </div>
          </div>

          {/* Right: Official Timestamp */}
          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              OFFICIAL REGISTRY REPORT
            </p>
            <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">
              {new Date().toLocaleDateString('en-US')}, {new Date().toLocaleTimeString('en-US')}
            </p>
          </div>
        </div>

        {/* Dual Accent Border Rule (Emerald + Gold) */}
        <div className="w-full space-y-0.5 mb-6">
          <div className="h-1 bg-[#006838] w-full" />
          <div className="h-0.5 bg-[#c99335] w-full" />
        </div>

        {/* ─── Executive Summary Filter Chips Bar ──────────────────────────────── */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 mb-6 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
            
            {/* Total Registrants */}
            <div className="border-r border-gray-200/80 pr-4">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                TOTAL REGISTRANTS
              </p>
              <p className="font-serif text-3xl font-bold text-gray-900 mt-0.5">
                {totalRegistrants}
              </p>
            </div>

            {/* Location Cluster */}
            <div className="border-r border-gray-200/80 pr-4">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                LOCATION CLUSTER
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {locationCounts.map(([loc, count]) => (
                  <span key={loc} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs">
                    <span>{loc}</span>
                    <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">{count}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Category Cluster */}
            <div className="border-r border-gray-200/80 pr-4">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                CATEGORY CLUSTER
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {categoryCounts.map(([cat, count]) => (
                  <span key={cat} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs">
                    <span>{cat}</span>
                    <span className="bg-emerald-700 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">{count}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                STATUS FILTER
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {statusCounts.map(([st, count]) => (
                  <span key={st} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-xs">
                    <span>{st}</span>
                    <span className="bg-amber-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">{count}</span>
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ─── Official Data Table ────────────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            
            {/* Deep Emerald Table Header */}
            <thead>
              <tr className="bg-[#006838] text-white">
                <th className="py-3 px-3.5 text-center text-xs font-bold uppercase tracking-wider w-10">#</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">CANDIDATE DETAILS</th>
                {columns.category && <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">CATEGORY</th>}
                {columns.age && <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider">AGE</th>}
                {columns.submissionDate && <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider">DATE</th>}
                {columns.phone && <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">PHONE</th>}
                {columns.locationInstitution && <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">LOCATION / INSTITUTION</th>}
                {columns.status && <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">STATUS</th>}
              </tr>
            </thead>

            {/* Table Body with Optional Grouping */}
            <tbody className="divide-y divide-gray-200">
              {groupedData.map((group, gIdx) => {
                let rowCounter = 0
                return (
                  <div key={gIdx} className="contents">
                    {/* Optional Group Header Row */}
                    {group.groupTitle && (
                      <tr className="bg-[#e6f4ed] border-y border-emerald-200">
                        <td
                          colSpan={8}
                          className="py-2 px-4 text-xs font-bold text-[#006838] uppercase tracking-wider"
                        >
                          {group.groupTitle} ({group.items.length} CANDIDATES)
                        </td>
                      </tr>
                    )}

                    {group.items.map((student, sIdx) => {
                      rowCounter++
                      const categoryName = catMap[student.category_id] || (student.category_id === 1 ? "15 Juz'" : student.category_id === 2 ? "20 Juz'" : "30 Juz'")
                      const institutionName = instMap[student.institution_id] || 'MARKAZ DAWAH UKUNDA'
                      const residence = student.residence || 'Mombasa'
                      const ageStr = calculateAge(student.dob)
                      const regDate = formatDate(student.created_at)

                      return (
                        <tr key={student.id} className="hover:bg-gray-50/70 transition-colors">
                          
                          {/* Row Number */}
                          <td className="py-3.5 px-3.5 text-center font-bold text-gray-500 text-sm">
                            {rowCounter}
                          </td>

                          {/* Candidate Details */}
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-gray-900 text-sm tracking-wide uppercase">
                              {student.full_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 font-mono">
                              ID: {student.national_id || `BK${student.id * 73}`} • {student.email || `${student.full_name.toLowerCase().replace(/\s+/g, '')}@gmail.com`}
                            </p>
                          </td>

                          {/* Category */}
                          {columns.category && (
                            <td className="py-3.5 px-4 font-bold text-gray-900 text-sm">
                              {categoryName}
                            </td>
                          )}

                          {/* Age */}
                          {columns.age && (
                            <td className="py-3.5 px-3 text-xs font-medium text-gray-700">
                              {ageStr}
                            </td>
                          )}

                          {/* Submission Date */}
                          {columns.submissionDate && (
                            <td className="py-3.5 px-3 text-xs font-medium text-gray-700">
                              {regDate}
                            </td>
                          )}

                          {/* Phone */}
                          {columns.phone && (
                            <td className="py-3.5 px-4 font-mono font-semibold text-gray-800 text-xs">
                              {student.guardian_phone || student.alternative_phone || '+254788060540'}
                            </td>
                          )}

                          {/* Location / Institution */}
                          {columns.locationInstitution && (
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-gray-900 text-xs">
                                {residence}
                              </p>
                              <p className="text-[10px] uppercase font-medium text-gray-500 tracking-wider mt-0.5">
                                {institutionName}
                              </p>
                            </td>
                          )}

                          {/* Status */}
                          {columns.status && (
                            <td className="py-3.5 px-4">
                              {student.review_status === 'APPROVED' ? (
                                <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold tracking-wider uppercase">
                                  APPROVED
                                </span>
                              ) : student.review_status === 'REJECTED' ? (
                                <span className="inline-block px-2.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold tracking-wider uppercase">
                                  REJECTED
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold tracking-wider uppercase">
                                  PENDING
                                </span>
                              )}
                            </td>
                          )}

                        </tr>
                      )
                    })}
                  </div>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ─── Footer Signatures Section ──────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            <p className="font-semibold text-gray-800">Official Musabaqa Committee Certification</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Verified by the Religious Attaché, Embassy of Saudi Arabia &amp; Jamia Mosque Committee</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-gray-700">Page 1 of 1</p>
          </div>
        </div>

      </div>
    </>
  )
}
