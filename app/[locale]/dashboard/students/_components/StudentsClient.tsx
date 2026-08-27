'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  Check, X, Search, Users, Clock, CheckCircle, XCircle, Loader2,
  FileText, Edit3, Tag, Trash2, Eye, Zap, MapPin, Download, ArrowUpDown, ArrowUp, ArrowDown, Plus,
  Save, Mail, User, Calendar, Paperclip, Upload, Printer, RefreshCw, FileDown, FileSpreadsheet,
  RotateCcw, Filter
} from 'lucide-react'

import {
  approveStudent, rejectStudent, reassignStudentCategory, updateStudent,
  bulkSoftDeleteStudents, getReportUrl, getExportAnalyticsUrl, getCompetitionConfig,
  type StudentRead, type InstitutionRead, type Category, type Region, type CompetitionConfig
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'
import DossierGeneratorModal from '@/components/DossierGeneratorModal'
import PrintReportModal from '@/components/PrintReportModal'
import ChangeCategoryModal from '@/components/ChangeCategoryModal'

type StudentsClientProps = {
  initialData: StudentRead[]
  institutions: InstitutionRead[]
  categories: Category[]
  regions: Region[]
  dict: Dict
  locale: string
  token: string
}

export default function StudentsClient({
  initialData, institutions, categories, regions, dict, locale, token
}: StudentsClientProps) {
  const t = dict.students
  const tc = dict.common
  const isAr = locale === 'ar'

  const [data, setData] = useState(initialData)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // Competition Config Scope State
  const [compConfig, setCompConfig] = useState<CompetitionConfig>(() => getCompetitionConfig())

  useEffect(() => {
    const updateConfig = () => setCompConfig(getCompetitionConfig())
    updateConfig()
    window.addEventListener('storage', updateConfig)
    window.addEventListener('focus', updateConfig)
    return () => {
      window.removeEventListener('storage', updateConfig)
      window.removeEventListener('focus', updateConfig)
    }
  }, [])

  const isNational = compConfig.scope === 'NATIONAL'

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [institutionFilter, setInstitutionFilter] = useState<string>('ALL')
  const [locationFilter, setLocationFilter] = useState<string>('ALL')

  // Modals & Action States
  const [showDossierModal, setShowDossierModal] = useState(false)
  const [showMultiSortModal, setShowMultiSortModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [reassigningStudent, setReassigningStudent] = useState<StudentRead | null>(null)
  const [reassignCatId, setReassignCatId] = useState<number>(0)
  const [ageExemption, setAgeExemption] = useState(false)

  const [editingStudent, setEditingStudent] = useState<StudentRead | null>(null)
  const [editName, setEditName] = useState('')
  const [editInstId, setEditInstId] = useState<number>(0)
  const [editCatId, setEditCatId] = useState<number>(0)
  const [editDob, setEditDob] = useState('')
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [editNationalId, setEditNationalId] = useState('')
  const [editNationality, setEditNationality] = useState('kenyan')
  const [editResidence, setEditResidence] = useState('Nakuru')
  const [editEmail, setEditEmail] = useState('')
  const [editGuardianPhone, setEditGuardianPhone] = useState('')
  const [editAltPhone, setEditAltPhone] = useState('')
  const [editStatus, setEditStatus] = useState<string>('PENDING_REVIEW')
  const [editNoteToInst, setEditNoteToInst] = useState('')
  const [editInternalNotes, setEditInternalNotes] = useState('')
  const [editNotifyEmail, setEditNotifyEmail] = useState(true)

  const [bulkRejectModal, setBulkRejectModal] = useState(false)
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const [bulkReason, setBulkReason] = useState('')

  const [approvingId, setApprovingId] = useState<number | null>(null)

  // Multi-Sort Rules state
  const [sortRules, setSortRules] = useState<Array<{ id: string; desc: boolean }>>([
    { id: 'full_name', desc: false },
    { id: 'institution_id', desc: true },
  ])

  const applySortPreset = (presetRules: Array<{ id: string; desc: boolean }>) => {
    setSortRules(presetRules)
    toast.success('Loaded sort preset')
  }

  const handleAddSortRule = () => {
    const available = ['full_name', 'institution_id', 'category_id', 'dob', 'created_at', 'review_status']
    const nextId = available.find(a => !sortRules.some(r => r.id === a)) || 'full_name'
    setSortRules(prev => [...prev, { id: nextId, desc: false }])
  }

  const handleRemoveSortRule = (index: number) => {
    setSortRules(prev => prev.filter((_, i) => i !== index))
  }

  const handleMoveSortRule = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= sortRules.length) return
    setSortRules(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[targetIdx]
      next[targetIdx] = temp
      return next
    })
  }

  const handleToggleSortDirection = (index: number) => {
    setSortRules(prev => prev.map((r, i) => i === index ? { ...r, desc: !r.desc } : r))
  }

  const handleUpdateSortField = (index: number, newId: string) => {
    setSortRules(prev => prev.map((r, i) => i === index ? { ...r, id: newId } : r))
  }

  const handleApplyMultiSort = () => {
    const newSorting: SortingState = sortRules
      .filter(r => r.id)
      .map(r => ({ id: r.id, desc: r.desc }))
    setSorting(newSorting)
    setShowMultiSortModal(false)
    toast.success(`Applied multi-level sorting (${newSorting.length} active rules)`)
  }

  const handleClearAllSorts = () => {
    setSortRules([])
    setSorting([])
    setShowMultiSortModal(false)
    toast.info('Cleared all sort rules')
  }

  const instMap = useMemo(() => Object.fromEntries(institutions.map(i => [i.id, i])), [institutions])
  const catMap  = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const regMap  = useMemo(() => Object.fromEntries(regions.map(r => [r.id, r])), [regions])

  const totalStudents    = data.length
  const pendingStudents  = data.filter(s => s.review_status === 'PENDING_REVIEW').length
  const approvedStudents = data.filter(s => s.review_status === 'APPROVED').length
  const rejectedStudents = data.filter(s => s.review_status === 'REJECTED').length

  const KENYA_COUNTIES = [
    'Nairobi', 'Mombasa', 'Nakuru', 'Garissa', 'Isiolo', 'Mandera', 'Wajir',
    'Kisumu', 'Kilifi', 'Kwale', 'Lamu', 'Kajiado', 'Machakos', 'Kiambu',
    'Uasin Gishu', 'Meru', 'Marsabit', 'Tana River', 'Turkana', 'Samburu',
    'Kakamega', 'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet',
    'Embu', 'Homa Bay', 'Kericho', 'Kirinyaga', 'Kisii', 'Kitui', 'Makueni',
    'Migori', "Murang'a", 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
    'Siaya', 'Taita Taveta', 'Tharaka Nithi', 'Trans Nzoia', 'Vihiga', 'West Pokot'
  ]

  // Distinct locations: If NATIONAL scope -> Kenya Counties; If COUNTY_REGIONAL scope -> Regional Zones
  const distinctLocations = useMemo(() => {
    const locSet = new Set<string>()

    if (isNational) {
      // 1. Configured national rows (counties)
      ;(compConfig.national_rows || []).forEach(r => {
        const clean = r.replace(/\s+County$/i, '').trim()
        if (clean) locSet.add(clean)
      })
      // 2. Standard 47 Kenya counties
      KENYA_COUNTIES.forEach(c => locSet.add(c))
      // 3. Any county/residence found in student dataset
      data.forEach(s => {
        if (s.residence) locSet.add(s.residence.replace(/\s+County$/i, '').trim())
        const c = (s as any).county
        if (c) locSet.add(String(c).replace(/\s+County$/i, '').trim())
      })
    } else {
      // County-level competition: internal regional zones
      regions.forEach(r => {
        if (r.name_en) locSet.add(r.name_en)
      })
      ;(compConfig.county_rows || []).forEach(r => {
        if (r) locSet.add(r)
      })
      data.forEach(s => {
        if (s.residence) locSet.add(s.residence)
        const c = (s as any).county
        if (c) locSet.add(c)
      })
    }

    return Array.from(locSet).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [isNational, compConfig, regions, data])

  // Filtered dataset according to Status, Category, Location (County or Zone), Institution, and Search Query
  const filteredData = useMemo(() => {
    return data.filter(student => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && student.review_status !== statusFilter) {
        return false
      }
      // 2. Category Filter
      if (categoryFilter !== 'ALL' && String(student.category_id) !== String(categoryFilter)) {
        return false
      }
      // 3. Institution Filter
      if (institutionFilter !== 'ALL' && String(student.institution_id) !== String(institutionFilter)) {
        return false
      }
      // 4. Location Filter (County when national, Regional Zone when county-level)
      if (locationFilter !== 'ALL') {
        const target = locationFilter.toLowerCase().replace(/\s+county$/i, '').trim()
        const residence = (student.residence || '').toLowerCase().replace(/\s+county$/i, '').trim()
        const county = ((student as any).county || '').toLowerCase().replace(/\s+county$/i, '').trim()
        const inst = instMap[student.institution_id]
        const reg = inst?.region_id ? regMap[inst.region_id] : null
        const regEn = (reg?.name_en || '').toLowerCase()
        const regAr = (reg?.name_ar || '').toLowerCase()

        if (isNational) {
          const match =
            residence.includes(target) ||
            county.includes(target) ||
            (residence.length > 2 && target.includes(residence)) ||
            (county.length > 2 && target.includes(county)) ||
            regEn.includes(target) ||
            regAr.includes(target)

          if (!match) return false
        } else {
          const match =
            regEn.includes(target) ||
            regAr.includes(target) ||
            residence.includes(target) ||
            county.includes(target)

          if (!match) return false
        }
      }
      // 5. Global Search Text
      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase().trim()
        const instName = (instMap[student.institution_id]?.name || '').toLowerCase()
        const cat = catMap[student.category_id]
        const catName = `${cat?.name_en || ''} ${cat?.name_ar || ''}`.toLowerCase()
        const name = (student.full_name || '').toLowerCase()
        const phone = (student.guardian_phone || '').toLowerCase()
        const altPhone = (student.alternative_phone || '').toLowerCase()
        const email = (student.email || '').toLowerCase()
        const nationalId = (student.national_id || '').toLowerCase()
        const refId = `ref-000${student.id}`.toLowerCase()
        const residence = (student.residence || '').toLowerCase()
        const county = ((student as any).county || '').toLowerCase()

        const match =
          name.includes(q) ||
          phone.includes(q) ||
          altPhone.includes(q) ||
          email.includes(q) ||
          nationalId.includes(q) ||
          refId.includes(q) ||
          instName.includes(q) ||
          catName.includes(q) ||
          residence.includes(q) ||
          county.includes(q)

        if (!match) return false
      }
      return true
    })
  }, [data, statusFilter, categoryFilter, institutionFilter, locationFilter, globalFilter, instMap, catMap, regMap, isNational])

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    institutionFilter !== 'ALL' ||
    locationFilter !== 'ALL' ||
    globalFilter.trim() !== ''

  const handleClearAllFilters = () => {
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setInstitutionFilter('ALL')
    setLocationFilter('ALL')
    setGlobalFilter('')
    toast.info('All filters cleared')
  }

  const selectedStudentList = useMemo(() => {
    return Object.keys(rowSelection).filter(k => rowSelection[k]).map(idx => filteredData[Number(idx)]).filter(Boolean)
  }, [rowSelection, filteredData])

  const calculateAgeInfo = (dobString: string) => {
    if (!dobString) return { age: 0, formattedDob: '—' }
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    const formattedDob = birthDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    return { age, formattedDob }
  }

  const handleApprove = async (id: number) => {
    setApprovingId(id)
    try {
      const updated = await approveStudent(token, id)
      setData(d => d.map(s => s.id === id ? updated : s))
      toast.success('Candidate approved')
    } catch (e: any) { toast.error(e.message || tc.error) }
    finally { setApprovingId(null) }
  }

  const handleSingleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return
    try {
      const updated = await rejectStudent(token, rejectingId, rejectionReason)
      setData(d => d.map(s => s.id === rejectingId ? updated : s))
      toast.success('Candidate rejected')
      setRejectingId(null)
      setRejectionReason('')
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleBulkApprove = async () => {
    const ids = selectedStudentList.map(s => s.id)
    if (ids.length === 0) return
    try {
      for (const id of ids) {
        await approveStudent(token, id)
      }
      setData(d => d.map(s => ids.includes(s.id) ? { ...s, review_status: 'APPROVED' } : s))
      toast.success(`Approved ${ids.length} candidate(s)`)
      setRowSelection({})
    } catch (e: any) { toast.error(e.message || 'Failed to approve selected candidates') }
  }

  const handleBulkReject = async () => {
    const ids = selectedStudentList.map(s => s.id)
    if (ids.length === 0 || !bulkReason.trim()) return
    try {
      for (const id of ids) {
        await rejectStudent(token, id, bulkReason)
      }
      setData(d => d.map(s => ids.includes(s.id) ? { ...s, review_status: 'REJECTED', rejection_reason: bulkReason } : s))
      toast.success(`Rejected ${ids.length} candidate(s)`)
      setRowSelection({})
      setBulkRejectModal(false)
      setBulkReason('')
    } catch (e: any) { toast.error(e.message || 'Failed to reject selected candidates') }
  }

  const handleBulkDelete = async () => {
    const ids = selectedStudentList.map(s => s.id)
    if (ids.length === 0 || !bulkReason.trim()) return
    try {
      await bulkSoftDeleteStudents(token, ids, bulkReason)
      setData(d => d.filter(s => !ids.includes(s.id)))
      toast.success(`Archived ${ids.length} candidate(s)`)
      setRowSelection({})
      setBulkDeleteModal(false)
      setBulkReason('')
    } catch (e: any) { toast.error(e.message || 'Failed to delete selected candidates') }
  }

  const handleOpenEdit = (student: StudentRead) => {
    setEditingStudent(student)
    setEditName(student.full_name)
    setEditInstId(student.institution_id)
    setEditCatId(student.category_id)
    setEditDob(student.dob)
    setEditGender(student.gender)
    setEditNationalId(student.national_id)
    setEditNationality(student.nationality || 'kenyan')
    setEditResidence(student.residence || 'Nakuru')
    setEditEmail(student.email || instMap[student.institution_id]?.email || '')
    setEditGuardianPhone(student.guardian_phone)
    setEditAltPhone(student.alternative_phone || '')
    setEditStatus(student.review_status)
    setEditNoteToInst('')
    setEditInternalNotes(student.review_notes || '')
    setEditNotifyEmail(true)
  }

  const handleSaveEdit = async () => {
    if (!editingStudent) return
    try {
      const updated = await updateStudent(token, editingStudent.id, {
        full_name: editName,
        institution_id: Number(editInstId) || editingStudent.institution_id,
        category_id: Number(editCatId) || editingStudent.category_id,
        dob: editDob,
        gender: editGender,
        national_id: editNationalId,
        nationality: editNationality,
        residence: editResidence,
        email: editEmail,
        guardian_phone: editGuardianPhone,
        alternative_phone: editAltPhone,
        review_status: editStatus as any,
        review_notes: editInternalNotes,
      })
      setData(d => d.map(s => s.id === editingStudent.id ? updated : s))
      if (editNotifyEmail && editEmail) {
        toast.success(`Candidate details saved & notification sent to ${editEmail}`)
      } else {
        toast.success('Candidate details updated successfully')
      }
      setEditingStudent(null)
    } catch (e: any) { toast.error(e.message || 'Failed to update candidate') }
  }

  const handleReassignSubmit = async () => {
    if (!reassigningStudent || !reassignCatId) return
    try {
      const updated = await reassignStudentCategory(token, reassigningStudent.id, reassignCatId, ageExemption)
      setData(d => d.map(s => s.id === reassigningStudent.id ? updated : s))
      toast.success('Category reassigned')
      setReassigningStudent(null)
    } catch (e: any) { toast.error(e.message || 'Failed to reassign category') }
  }

  const columnHelper = createColumnHelper<StudentRead>()
  const columns = [
    columnHelper.display({
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
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('full_name', {
      id: 'full_name',
      header: 'Candidate',
      enableSorting: true,
      sortingFn: 'alphanumeric',
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="py-1">
            <Link
              href={`/${locale}/dashboard/students/${s.id}`}
              className="font-bold text-sm text-gray-900 hover:text-emerald-800 transition-colors block"
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
                  <span className="text-gray-400">{s.email}</span>
                </>
              )}
            </div>
          </div>
        )
      }
    }),
    columnHelper.accessor('category_id', {
      id: 'category_id',
      header: 'Category & Age',
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const catA = catMap[rowA.original.category_id]?.name_en || ''
        const catB = catMap[rowB.original.category_id]?.name_en || ''
        const comp = catA.localeCompare(catB)
        if (comp !== 0) return comp
        return (new Date(rowA.original.dob).getTime() || 0) - (new Date(rowB.original.dob).getTime() || 0)
      },
      cell: ({ row }) => {
        const s = row.original
        const cat = catMap[s.category_id]
        const { age, formattedDob } = calculateAgeInfo(s.dob)
        return (
          <div>
            <p className="font-serif font-bold text-sm text-gray-900">
              {cat ? (isAr ? cat.name_ar : cat.name_en) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Age: <span className="font-semibold text-gray-800">{age} yrs</span> ({formattedDob})
            </p>
          </div>
        )
      }
    }),
    columnHelper.accessor('institution_id', {
      id: 'institution_id',
      header: isNational ? 'County & Institution' : 'Location & Institution',
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const instA = instMap[rowA.original.institution_id]?.name || ''
        const instB = instMap[rowB.original.institution_id]?.name || ''
        return instA.localeCompare(instB)
      },
      cell: ({ row }) => {
        const s = row.original
        const inst = instMap[s.institution_id]
        const reg = inst && inst.region_id ? regMap[inst.region_id] : null
        const locationDisplay = isNational
          ? (s.residence || (s as any).county || (reg ? (isAr ? reg.name_ar : reg.name_en) : 'Nairobi'))
          : (reg ? (isAr ? reg.name_ar : reg.name_en) : s.residence || 'Nairobi')

        return (
          <div>
            <p className="font-bold text-xs text-gray-900 truncate max-w-[200px]">
              {inst?.name || `Institution #${s.institution_id}`}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <MapPin size={11} className="text-rose-500 shrink-0" />
              <span className="font-medium text-gray-700">{locationDisplay}</span>
              <span className="text-[10px] text-gray-400">({s.nationality ? s.nationality.toLowerCase() : 'kenyan'})</span>
            </div>
          </div>
        )
      }
    }),
    columnHelper.accessor('review_status', {
      id: 'review_status',
      header: 'Status',
      enableSorting: true,
      sortingFn: 'alphanumeric',
      cell: info => {
        const val = info.getValue()
        return (
          <span className={val === 'APPROVED' ? 'badge-approved' : val === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}>
            {val === 'APPROVED' ? '• Approved' : val === 'REJECTED' ? '• Rejected' : '• Pending'}
          </span>
        )
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original
        const isApproving = approvingId === s.id
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/${locale}/dashboard/students/${s.id}`}
              className="btn-secondary !py-1 !px-2.5 text-xs font-semibold text-sky-800 hover:bg-sky-50 border-sky-200"
              title="View full details"
            >
              Details
            </Link>
            <button
              onClick={() => handleOpenEdit(s)}
              className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1 text-gray-700"
              title="Edit Profile"
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              onClick={() => { setReassigningStudent(s); setReassignCatId(s.category_id) }}
              className="btn-secondary !py-1 !px-2 text-xs flex items-center gap-1 text-[#c99335]"
              title="Change Category"
            >
              <Tag size={12} /> Category
            </button>
            {s.review_status !== 'APPROVED' && (
              <button
                onClick={() => handleApprove(s.id)}
                disabled={isApproving}
                className="btn-primary !py-1 !px-2 text-xs flex items-center gap-1"
                title="Approve"
              >
                {isApproving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Approve
              </button>
            )}
          </div>
        )
      }
    })
  ]

  const handleExportCsv = () => {
    const rows = table.getSortedRowModel().rows.map(r => r.original)
    const headers = ['ID', 'Full Name', 'Category', 'Institution', 'Residence', 'Gender', 'DOB', 'National ID', 'Guardian Phone', 'Email', 'Status']
    const csvContent = [
      headers.join(','),
      ...rows.map(s => [
        s.id,
        `"${(s.full_name || '').replace(/"/g, '""')}"`,
        `"${(catMap[s.category_id]?.name_en || s.category_id)}"`,
        `"${(instMap[s.institution_id]?.name || s.institution_id)}"`,
        `"${s.residence || ''}"`,
        s.gender,
        s.dob || '',
        `"${s.national_id || ''}"`,
        `"${s.guardian_phone || ''}"`,
        `"${s.email || ''}"`,
        s.review_status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Candidates_Registry_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} candidates to CSV`)
  }

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        subtitle={`${filteredData.length} of ${totalStudents} registered contestants displayed`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                toast.success('Refreshing candidate records...')
                setData([...initialData])
              }}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-xs transition-colors cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Printer size={15} className="text-gray-600" />
              <span>Print Report</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileDown size={15} className="text-emerald-700" />
              <span>Export List (CSV)</span>
            </button>
            <button
              onClick={() => {
                toast.info('Downloading normalized analytics dataset (.xlsx)...')
                window.open(getExportAnalyticsUrl('timeline'), '_blank')
              }}
              className="px-3.5 py-2 rounded-xl bg-[#1a1512] text-[#c99335] hover:text-amber-300 border border-[#2d2520] font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet size={15} className="text-[#c99335]" />
              <span>Analytics Export (.xlsx)</span>
            </button>
          </div>
        }
      />

      {/* Stats summary row (Interactive Filter Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'ALL',            label: 'Total Active', value: totalStudents,    icon: <Users size={15} />,       badge: 'bg-purple-50 text-purple-700 border-purple-200', numColor: 'text-purple-950', ring: 'ring-2 ring-purple-600 border-purple-400 bg-purple-50/20' },
          { key: 'PENDING_REVIEW', label: 'Pending',      value: pendingStudents,  icon: <Clock size={15} />,       badge: 'bg-amber-50 text-amber-700 border-amber-200',   numColor: 'text-amber-950',   ring: 'ring-2 ring-amber-600 border-amber-400 bg-amber-50/20' },
          { key: 'APPROVED',       label: 'Approved',     value: approvedStudents, icon: <CheckCircle size={15} />, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', numColor: 'text-emerald-950', ring: 'ring-2 ring-emerald-600 border-emerald-400 bg-emerald-50/20' },
          { key: 'REJECTED',       label: 'Rejected',     value: rejectedStudents, icon: <XCircle size={15} />,     badge: 'bg-rose-50 text-rose-700 border-rose-200',       numColor: 'text-rose-950',       ring: 'ring-2 ring-rose-600 border-rose-400 bg-rose-50/20' },
        ].map(stat => {
          const isSelected = statusFilter === stat.key
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => setStatusFilter(stat.key as any)}
              className={`text-left rounded-xl p-4 shadow-sm flex items-center justify-between transition-all cursor-pointer ${
                isSelected
                  ? `${stat.ring} shadow-md`
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div>
                <p className={`text-2xl font-bold font-serif ${stat.numColor}`}>{stat.value}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
              <div className={`p-2 rounded-lg border ${stat.badge}`}>
                {stat.icon}
              </div>
            </button>
          )
        })}
      </div>

      {/* Floating Multi-Select Bulk Action Bar */}
      {selectedStudentList.length > 0 && (
        <div className="bg-[#1a1512] text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-[#2d2520] animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-emerald-600 font-bold text-xs text-white">
              {selectedStudentList.length} Selected
            </span>
            <span className="text-xs text-gray-300 font-medium hidden sm:inline">
              Apply bulk decision or export selected rows
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkApprove}
              className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            >
              <Check size={13} /> Approve ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setBulkRejectModal(true)}
              className="w-auto py-1.5 px-3 rounded-lg border border-rose-400/30 text-rose-300 bg-rose-900/40 hover:bg-rose-800/60 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X size={13} /> Reject ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setBulkDeleteModal(true)}
              className="w-auto py-1.5 px-3 rounded-lg border border-gray-700 text-gray-300 bg-black/40 hover:bg-gray-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} /> Delete ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setShowDossierModal(true)}
              className="btn-gold !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            >
              <Download size={13} /> Download PDFs ({selectedStudentList.length})
            </button>
            <button
              onClick={() => setRowSelection({})}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Search + Category / Location / Status Filter Selects + Multi-Sort */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px] max-w-lg">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search candidate name, institution, phone, or email..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="input-field pl-10 text-xs"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="input-field !py-2 text-xs !w-auto min-w-[125px] font-medium bg-white cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="PENDING_REVIEW">Status: Pending</option>
              <option value="APPROVED">Status: Approved</option>
              <option value="REJECTED">Status: Rejected</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="input-field !py-2 text-xs !w-auto min-w-[135px] font-medium bg-white cursor-pointer"
            >
              <option value="ALL">Category: All</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {isAr ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>

            {/* Location / County Filter */}
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="input-field !py-2 text-xs !w-auto min-w-[140px] font-medium bg-white cursor-pointer"
            >
              <option value="ALL">
                {isNational
                  ? (isAr ? 'المحافظة: الكل' : 'County: All')
                  : (isAr ? 'المنطقة: الكل' : 'Location: All')}
              </option>
              {distinctLocations.map(loc => (
                <option key={loc} value={loc}>
                  {isNational ? `🇰🇪 ${loc}` : `📍 ${loc}`}
                </option>
              ))}
            </select>

            {/* Institution Filter */}
            <select
              value={institutionFilter}
              onChange={e => setInstitutionFilter(e.target.value)}
              className="input-field !py-2 text-xs !w-auto min-w-[150px] font-medium bg-white hidden xl:inline-block cursor-pointer"
            >
              <option value="ALL">Institution: All</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  🏛️ {inst.name}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* Multi-Level Sort */}
            <button
              onClick={() => setShowMultiSortModal(true)}
              className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-2 font-bold ml-auto sm:ml-0"
            >
              <Zap size={14} className="text-[#c99335]" />
              <span className="hidden sm:inline">Multi-Level Sort</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                {sorting.length || 1} tier
              </span>
            </button>

            {/* Dossier Generator */}
            <button
              onClick={() => {
                if (selectedStudentList.length === 0) {
                  toast.info('Select candidates using the checkboxes to generate dossiers')
                  return
                }
                setShowDossierModal(true)
              }}
              className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5 font-bold"
            >
              <FileText size={14} className="text-emerald-700" />
              <span className="hidden sm:inline">Dossier Generator</span>
            </button>

          </div>
        </div>

        {/* Active Filter Chips bar */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="text-gray-400 font-semibold text-[11px]">Active Filters ({filteredData.length} matches):</span>
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                Status: {statusFilter === 'PENDING_REVIEW' ? 'Pending' : statusFilter === 'APPROVED' ? 'Approved' : 'Rejected'}
                <button onClick={() => setStatusFilter('ALL')} className="hover:text-amber-950 font-bold ml-0.5 cursor-pointer">✕</button>
              </span>
            )}
            {categoryFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                Category: {catMap[Number(categoryFilter)]?.name_en || categoryFilter}
                <button onClick={() => setCategoryFilter('ALL')} className="hover:text-emerald-950 font-bold ml-0.5 cursor-pointer">✕</button>
              </span>
            )}
            {locationFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-medium">
                {isNational ? (isAr ? 'المحافظة' : 'County') : (isAr ? 'المنطقة' : 'Location')}: {locationFilter}
                <button onClick={() => setLocationFilter('ALL')} className="hover:text-sky-950 font-bold ml-0.5 cursor-pointer">✕</button>
              </span>
            )}
            {institutionFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-medium">
                Institution: {instMap[Number(institutionFilter)]?.name || institutionFilter}
                <button onClick={() => setInstitutionFilter('ALL')} className="hover:text-purple-950 font-bold ml-0.5 cursor-pointer">✕</button>
              </span>
            )}
            {globalFilter.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                Query: "{globalFilter}"
                <button onClick={() => setGlobalFilter('')} className="hover:text-black font-bold ml-0.5 cursor-pointer">✕</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Candidates Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => {
                    const canSort = h.column.getCanSort()
                    const isSorted = h.column.getIsSorted()
                    return (
                      <th
                        key={h.id}
                        className={`table-th ${
                          canSort
                            ? 'cursor-pointer select-none hover:bg-gray-100/90 transition-colors group'
                            : ''
                        }`}
                        onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                        title={
                          canSort
                            ? `Click to sort by ${typeof h.column.columnDef.header === 'string' ? h.column.columnDef.header : 'column'} (${
                                isSorted === 'asc' ? 'Descending next' : isSorted === 'desc' ? 'Clear sort' : 'Ascending next'
                              })`
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</span>
                          {canSort && (
                            <span className="inline-flex items-center shrink-0">
                              {isSorted === 'asc' && (
                                <ArrowUp size={13} className="text-emerald-700 font-extrabold" />
                              )}
                              {isSorted === 'desc' && (
                                <ArrowDown size={13} className="text-emerald-700 font-extrabold" />
                              )}
                              {!isSorted && (
                                <ArrowUpDown size={12} className="text-gray-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No candidates match your filters</p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearAllFilters}
                        className="mt-2 text-xs font-bold text-emerald-800 hover:underline cursor-pointer inline-block"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${row.getIsSelected() ? 'bg-emerald-50/40' : 'hover:bg-gray-50/60'}`}
                  >
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

      {/* Candidate Dossier PDF Generator Modal */}
      <DossierGeneratorModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        selectedStudents={selectedStudentList.length > 0 ? selectedStudentList : data.slice(0, 10)}
        categories={categories}
        locale={locale}
        token={token}
      />

      {/* Official Print Premium Report Modal & Printable Layout */}
      <PrintReportModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        students={data}
        categories={categories}
        institutions={institutions}
        locale={locale}
        selectedStudentIds={selectedStudentList.map(s => s.id)}
      />

      {/* Multi-Row / Multi-Column Sorting Modal (Ultra-Premium Jamia Theme) */}
      {showMultiSortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            
            {/* Emerald Header Banner */}
            <div className="bg-gradient-to-r from-[#004d29] via-[#006838] to-[#004d29] p-6 text-white relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-[#c99335]/40 text-[#c99335] text-[10px] font-bold tracking-wider uppercase">
                    <Zap size={11} className="fill-[#c99335]" />
                    <span>Multi-Row / Multi-Column Sorting</span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-white mt-2">
                    Configure Sequential Sort Rules
                  </h2>
                  <p className="text-xs text-emerald-100/80 mt-1 max-w-lg leading-relaxed">
                    Sort candidates across multiple tiers. When two candidates share the same primary value, secondary and tertiary rules resolve order.
                  </p>
                </div>

                <button
                  onClick={() => setShowMultiSortModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {/* Quick Presets */}
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applySortPreset([
                      { id: 'institution_id', desc: false },
                      { id: 'category_id', desc: false },
                      { id: 'full_name', desc: false }
                    ])}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#006838] bg-white hover:bg-emerald-50/50 text-xs font-semibold text-gray-700 hover:text-emerald-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>🗺️</span> <span>County → Category → Name</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applySortPreset([
                      { id: 'category_id', desc: false },
                      { id: 'dob', desc: false },
                      { id: 'full_name', desc: false }
                    ])}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#006838] bg-white hover:bg-emerald-50/50 text-xs font-semibold text-gray-700 hover:text-emerald-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>📖</span> <span>Category → Age → Name</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applySortPreset([
                      { id: 'review_status', desc: false },
                      { id: 'created_at', desc: true }
                    ])}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#006838] bg-white hover:bg-emerald-50/50 text-xs font-semibold text-gray-700 hover:text-emerald-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>🚦</span> <span>Status → Date (Newest)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applySortPreset([
                      { id: 'institution_id', desc: false },
                      { id: 'full_name', desc: false }
                    ])}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#006838] bg-white hover:bg-emerald-50/50 text-xs font-semibold text-gray-700 hover:text-emerald-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>🏛️</span> <span>Institution → County → Name</span>
                  </button>
                </div>
              </div>

              {/* Sort Level Rows */}
              <div className="space-y-3">
                {sortRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all hover:border-gray-300"
                  >
                    {/* Tier Number & Label */}
                    <div className="flex items-center gap-2.5 shrink-0 min-w-[100px]">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white ${idx === 0 ? 'bg-[#006838]' : 'bg-slate-700'}`}>
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs text-gray-800">
                        {idx === 0 ? 'Primary' : 'Then by'}
                      </span>
                    </div>

                    {/* Column Select Dropdown */}
                    <div className="flex-1 min-w-[160px]">
                      <select
                        value={rule.id}
                        onChange={e => handleUpdateSortField(idx, e.target.value)}
                        className="input-field !py-2 text-xs font-medium bg-white"
                      >
                        <option value="full_name">👤 Candidate Name</option>
                        <option value="institution_id">🗺️ Location (County / Region)</option>
                        <option value="category_id">📖 Memorization Category</option>
                        <option value="dob">🎂 Age / Date of Birth</option>
                        <option value="created_at">📅 Submission Date</option>
                        <option value="review_status">🚦 Review Status</option>
                      </select>
                    </div>

                    {/* Direction Toggle Pill */}
                    <button
                      type="button"
                      onClick={() => handleToggleSortDirection(idx)}
                      className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border ${
                        !rule.desc
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {!rule.desc ? (
                        <>
                          <span className="text-emerald-700 font-extrabold text-sm">↑</span>
                          <span>Ascending</span>
                          <span className="text-emerald-600 font-normal text-[11px]">(A-Z / 1-9)</span>
                        </>
                      ) : (
                        <>
                          <span className="text-amber-700 font-extrabold text-sm">↓</span>
                          <span>Descending</span>
                          <span className="text-amber-600 font-normal text-[11px]">(Z-A / 9-1)</span>
                        </>
                      )}
                    </button>

                    {/* Up / Down / Delete Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSortRule(idx, 'up')}
                        className={`p-1.5 rounded-lg border text-xs ${idx === 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-100 cursor-pointer'}`}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortRules.length - 1}
                        onClick={() => handleMoveSortRule(idx, 'down')}
                        className={`p-1.5 rounded-lg border text-xs ${idx === sortRules.length - 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-100 cursor-pointer'}`}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSortRule(idx)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove Level"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Another Sort Level Button */}
                <button
                  type="button"
                  onClick={handleAddSortRule}
                  className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-[#006838] bg-emerald-50/40 hover:bg-emerald-50 text-[#006838] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus size={14} />
                  <span>Add Another Sort Level (Row {sortRules.length + 1})</span>
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearAllSorts}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                Clear All Sorts
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMultiSortModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyMultiSort}
                  className="btn-primary !py-2 !px-5 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Check size={14} />
                  <span>Apply Multi-Sort ({sortRules.length} rules)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── EDIT REGISTRANT DETAILS MODAL (Exact match to reference screenshots) ─── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-gray-900 leading-tight">
                    Edit Registrant Details
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span>{editingStudent.full_name}</span> • <span className="font-mono font-bold text-emerald-800">REF-000{editingStudent.id}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* CARD 1: CANDIDATE IDENTITY & DOCUMENTS */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-sky-800 font-serif font-bold text-xs uppercase tracking-wider">
                  <User size={14} className="text-sky-600" />
                  <span>CANDIDATE IDENTITY & DOCUMENTS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">CANDIDATE FULL NAME *</label>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="input-field text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="label">NOMINATING INSTITUTION / SCHOOL *</label>
                    <select
                      value={editInstId}
                      onChange={e => setEditInstId(Number(e.target.value))}
                      className="input-field text-xs font-medium cursor-pointer"
                    >
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Document Uploaders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Passport Photo */}
                  <div className="p-3.5 border border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col justify-between gap-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">PASSPORT PHOTO (COLOUR)</p>
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-16 rounded-lg bg-gray-200 overflow-hidden border border-gray-300 shrink-0 flex items-center justify-center">
                        {editingStudent.photo ? (
                          <img src={editingStudent.photo} alt={editingStudent.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => toast.info('Photo uploader: select an image file')}
                          className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 text-sky-800 font-semibold"
                        >
                          <Upload size={12} /> <span>Upload New Photo</span>
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">JPEG, PNG, WEBP (Max 5MB)</p>
                      </div>
                    </div>
                  </div>

                  {/* ID Document */}
                  <div className="p-3.5 border border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col justify-between gap-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ID DOCUMENT (BIRTH CERT / ID / PASSPORT)</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
                        <FileText size={22} />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => toast.info('Document uploader: select a PDF or image')}
                          className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 text-gray-700 font-semibold"
                        >
                          <Paperclip size={12} /> <span>Replace ID Document</span>
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">PDF, JPEG, PNG (Max 10MB)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: PERSONAL & CONTACT DETAILS */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-amber-800 font-serif font-bold text-xs uppercase tracking-wider">
                  <span>📋</span>
                  <span>PERSONAL & CONTACT DETAILS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">DATE OF BIRTH *</label>
                    <input
                      type="date"
                      value={editDob}
                      onChange={e => setEditDob(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">MEMORIZATION CATEGORY *</label>
                    <select
                      value={editCatId}
                      onChange={e => setEditCatId(Number(e.target.value))}
                      className="input-field text-xs font-semibold cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name_en} {c.max_age ? `(Max Age: ${c.max_age} yrs)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">NATIONAL ID / PASSPORT NUMBER</label>
                    <input
                      value={editNationalId}
                      onChange={e => setEditNationalId(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">NATIONALITY / RESIDENCY</label>
                    <input
                      value={editNationality}
                      onChange={e => setEditNationality(e.target.value)}
                      className="input-field text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">CURRENT PLACE OF RESIDENCE</label>
                    <input
                      value={editResidence}
                      onChange={e => setEditResidence(e.target.value)}
                      className="input-field text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="label">COUNTY (FOR PRELIMINARY)</label>
                    <input
                      value={editResidence}
                      onChange={e => setEditResidence(e.target.value)}
                      className="input-field text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">INSTITUTION / CANDIDATE EMAIL *</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">PRIMARY PHONE NUMBER</label>
                    <input
                      value={editGuardianPhone}
                      onChange={e => setEditGuardianPhone(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">ALTERNATIVE PHONE</label>
                    <input
                      value={editAltPhone}
                      onChange={e => setEditAltPhone(e.target.value)}
                      className="input-field text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">VERIFICATION STATUS</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="input-field text-xs font-semibold cursor-pointer"
                    >
                      <option value="PENDING_REVIEW">⏳ Pending Review</option>
                      <option value="APPROVED">✅ Approved</option>
                      <option value="REJECTED">❌ Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">NOTE TO INSTITUTION / REASON FOR UPDATE (INCLUDED IN EMAIL)</label>
                  <input
                    value={editNoteToInst}
                    onChange={e => setEditNoteToInst(e.target.value)}
                    placeholder="e.g. Corrected spelling of candidate's surname and updated passport photo per institution request."
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="label">INTERNAL ADMINISTRATIVE REVIEW NOTES</label>
                  <textarea
                    rows={2}
                    value={editInternalNotes}
                    onChange={e => setEditInternalNotes(e.target.value)}
                    placeholder="Private notes for the committee..."
                    className="input-field text-xs resize-none"
                  />
                </div>
              </div>

              {/* CARD 3: EMAIL NOTIFICATION BANNER */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">Notify Institution & Candidate via Email</p>
                    <p className="text-[11px] text-gray-500">
                      Automatically sends an official update notification to <strong className="text-emerald-900 font-mono">{editEmail || 'institution email'}</strong>.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 shrink-0 self-end sm:self-center">
                  <input
                    type="checkbox"
                    checked={editNotifyEmail}
                    onChange={e => setEditNotifyEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#006838]"
                  />
                  <span>Send Email</span>
                </label>
              </div>

            </div>

            {/* Modal Footer Actions */}
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
                onClick={handleSaveEdit}
                className="btn-primary !py-2 !px-6 text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Save size={14} />
                <span>Save & Notify Institution</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Change Memorization Category Modal */}
      <ChangeCategoryModal
        isOpen={!!reassigningStudent}
        onClose={() => setReassigningStudent(null)}
        student={reassigningStudent}
        categories={categories}
        token={token}
        locale={locale}
        onSuccess={(updatedStudent) => {
          setData(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s))
          setReassigningStudent(null)
        }}
      />

      {/* Bulk Reject Modal */}
      <Modal isOpen={bulkRejectModal} onClose={() => setBulkRejectModal(false)} title={`Reject ${selectedStudentList.length} Selected Candidates`} variant="danger">
        <div className="space-y-4">
          <div>
            <label className="label">Rejection Reason for Selected</label>
            <textarea
              rows={3}
              value={bulkReason}
              onChange={e => setBulkReason(e.target.value)}
              placeholder="e.g. Quota limit exceeded, invalid verification documents..."
              className="input-field resize-none text-xs"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setBulkRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleBulkReject} className="btn-primary !bg-rose-700 hover:!bg-rose-800">Confirm Bulk Rejection</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal isOpen={bulkDeleteModal} onClose={() => setBulkDeleteModal(false)} title={`Archive ${selectedStudentList.length} Selected Candidates`} variant="danger">
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Archiving will remove selected candidates from the active competition roster.
          </p>
          <div>
            <label className="label">Archival Reason</label>
            <textarea
              rows={2}
              value={bulkReason}
              onChange={e => setBulkReason(e.target.value)}
              placeholder="Reason for archival..."
              className="input-field resize-none text-xs"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setBulkDeleteModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleBulkDelete} className="btn-primary !bg-rose-700 hover:!bg-rose-800">Archive Candidates</button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
