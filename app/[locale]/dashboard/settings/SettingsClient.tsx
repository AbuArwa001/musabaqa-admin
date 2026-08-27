'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  createAdminUser, createRegion, createCategory, updateCategory, getCompetitionConfig, saveCompetitionConfig,
  type Region, type Category, type AdminUserRead, type CompetitionConfig
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { UserPlus, MapPin, List, Settings, Trophy, Calendar, MapPin as LocationIcon, FileText, Sliders, Save, Globe, Flag, Edit, Plus, Check, Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['SUPERADMIN', 'JUDGE', 'MODERATOR']),
  judge_role: z.enum(['REGULAR', 'GUEST_NEUTRAL']).optional().nullable(),
  preferred_language: z.enum(['EN', 'AR']),
})

const regionSchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  county_id: z.string().min(1),
})

const categorySchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  category_group: z.string().min(2),
  min_age: z.string().optional(),
  max_age: z.string().min(1),
  display_order: z.string().min(1),
})

export default function SettingsClient({ 
  regions: initialRegions, categories: initialCategories, users: initialUsers, dict, locale, token 
}: { 
  regions: Region[], categories: Category[], users: AdminUserRead[], dict: Dict, locale: string, token: string 
}) {
  const t = dict.settings
  const tc = dict.common

  const [activeTab, setActiveTab] = useState<'config' | 'users' | 'regions' | 'categories'>('config')
  const [users, setUsers] = useState(initialUsers)
  const [regions, setRegions] = useState(initialRegions)
  const [categories, setCategories] = useState(initialCategories)

  // Competition Config state
  const [compConfig, setCompConfig] = useState<CompetitionConfig>(getCompetitionConfig())

  // Category Edit state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [catNameEn, setCatNameEn] = useState('')
  const [catNameAr, setCatNameAr] = useState('')
  const [catGroup, setCatGroup] = useState('')
  const [catMinAge, setCatMinAge] = useState<string>('0')
  const [catMaxAge, setCatMaxAge] = useState<string>('99')
  const [catOrder, setCatOrder] = useState<string>('1')

  // Matrix Row Add state
  const [newRowName, setNewRowName] = useState('')
  
  const { register: regUser, handleSubmit: handleUser, reset: resetUser, watch: watchUser, formState: { isSubmitting: isSubUser } } = useForm<z.infer<typeof userSchema>>({ resolver: zodResolver(userSchema) })
  const { register: regRegion, handleSubmit: handleRegion, reset: resetRegion, formState: { isSubmitting: isSubRegion } } = useForm<z.infer<typeof regionSchema>>({ resolver: zodResolver(regionSchema) })
  const { register: regCat, handleSubmit: handleCat, reset: resetCat, formState: { isSubmitting: isSubCat } } = useForm<z.infer<typeof categorySchema>>({ resolver: zodResolver(categorySchema) })

  const userRole = watchUser('role')

  useEffect(() => {
    setCompConfig(getCompetitionConfig())
  }, [])

  const onUserSubmit = async (data: z.infer<typeof userSchema>) => {
    try {
      const created = await createAdminUser(token, {
        ...data,
        judge_role: data.role === 'JUDGE' ? (data.judge_role || 'REGULAR') : null
      })
      setUsers([...users, created])
      toast.success('Admin user created')
      resetUser()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const onRegionSubmit = async (data: z.infer<typeof regionSchema>) => {
    try {
      const created = await createRegion(token, {
        name_en: data.name_en, name_ar: data.name_ar, county_id: Number(data.county_id)
      })
      setRegions([...regions, created])
      toast.success('Region created')
      resetRegion()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const onCategorySubmit = async (data: z.infer<typeof categorySchema>) => {
    try {
      const created = await createCategory(token, {
        name_en: data.name_en,
        name_ar: data.name_ar,
        category_group: data.category_group,
        min_age: data.min_age ? Number(data.min_age) : null,
        max_age: Number(data.max_age),
        display_order: Number(data.display_order),
      })
      setCategories([...categories, created])
      toast.success('Category created successfully')
      resetCat()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    setCatNameEn(cat.name_en)
    setCatNameAr(cat.name_ar)
    setCatGroup(cat.category_group)
    setCatMinAge(cat.min_age !== null && cat.min_age !== undefined ? String(cat.min_age) : '0')
    setCatMaxAge(String(cat.max_age || '99'))
    setCatOrder(String(cat.display_order || '1'))
  }

  const handleSaveEditCategory = async () => {
    if (!editingCategory) return
    try {
      const updated = await updateCategory(token, editingCategory.id, {
        name_en: catNameEn,
        name_ar: catNameAr,
        category_group: catGroup,
        min_age: catMinAge ? Number(catMinAge) : null,
        max_age: Number(catMaxAge),
        display_order: Number(catOrder),
      })
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? updated : c))
      toast.success('Category updated successfully')
      setEditingCategory(null)
    } catch (e: any) { toast.error(e.message || 'Failed to update category') }
  }

  const handleSaveCompetitionConfig = () => {
    saveCompetitionConfig(compConfig)
    toast.success('Competition configuration saved successfully!')
  }

  const handleGranularLimitChange = (regionName: string, juzCategory: string, val: string) => {
    setCompConfig(prev => {
      const newLimits = { ...prev.granular_limits }
      if (!newLimits[regionName]) newLimits[regionName] = {}
      newLimits[regionName][juzCategory] = val === '' || val.toLowerCase() === 'def' ? 'Def' : Number(val)
      return { ...prev, granular_limits: newLimits }
    })
  }

  // Active matrix regions based on scope
  const activeMatrixList = compConfig.scope === 'NATIONAL'
    ? (compConfig.national_rows || ['Nairobi County', 'Mombasa County', 'Nakuru County', 'Garissa County', 'Isiolo County', 'Mandera County', 'Wajir County', 'Kisumu County', 'Kilifi County', 'Lamu County'])
    : (compConfig.county_rows || ['Eastleigh', 'Kiamaiko', 'Komarock', 'Kasarani', 'Westlands', 'Kibra', 'South C', 'Pangani', 'Dandora', 'Kayole'])

  const handleAddMatrixRow = () => {
    const trimmed = newRowName.trim()
    if (!trimmed) {
      toast.error('Please enter a name for the county or region row')
      return
    }
    if (activeMatrixList.includes(trimmed)) {
      toast.error(`"${trimmed}" is already in the matrix`)
      return
    }

    setCompConfig(prev => {
      const isNat = prev.scope === 'NATIONAL'
      const key = isNat ? 'national_rows' : 'county_rows'
      const existing = prev[key] || activeMatrixList
      const newRows = [...existing, trimmed]
      const newLimits = { ...prev.granular_limits }
      newLimits[trimmed] = { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' }
      return { ...prev, [key]: newRows, granular_limits: newLimits }
    })

    toast.success(`Added "${trimmed}" to quota matrix`)
    setNewRowName('')
  }

  const handleDeleteMatrixRow = (rowName: string) => {
    setCompConfig(prev => {
      const isNat = prev.scope === 'NATIONAL'
      const key = isNat ? 'national_rows' : 'county_rows'
      const existing = prev[key] || activeMatrixList
      const newRows = existing.filter(r => r !== rowName)
      const newLimits = { ...prev.granular_limits }
      delete newLimits[rowName]
      return { ...prev, [key]: newRows, granular_limits: newLimits }
    })
    toast.success(`Removed "${rowName}" from quota matrix`)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Competition & System Settings"
        subtitle="Manage event dates, competition scope, quota capacities, regions, judging categories, and staff accounts"
      />
      
      {/* Top Nav Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'config'
              ? 'bg-[#006838] text-white border-[#004d29] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <Trophy size={14} className={activeTab === 'config' ? 'text-[#c99335]' : 'text-gray-500'} />
          <span>Competition Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'categories'
              ? 'bg-[#006838] text-white border-[#004d29] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <List size={14} />
          <span>Judging Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'users'
              ? 'bg-[#006838] text-white border-[#004d29] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <Settings size={14} />
          <span>Manage Administrators ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('regions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'regions'
              ? 'bg-[#006838] text-white border-[#004d29] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <MapPin size={14} />
          <span>Regions & Zones ({regions.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: Competition Configuration ─────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          
          {/* Competition Scope Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <Globe size={18} className="text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                Competition Scope & Organizational Level
              </h2>
            </div>

            <div className="pt-4 space-y-4">
              <p className="text-xs text-gray-600">
                Choose the structural scope of the competition. National level divides registration quotas across Kenya counties (Nairobi, Mombasa, Nakuru, Garissa, etc.), while County level divides quotas across internal regional zones (e.g. Eastleigh, Kiamaiko, Komarock, Kasarani, etc.).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  onClick={() => setCompConfig(c => ({ ...c, scope: 'NATIONAL' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    compConfig.scope === 'NATIONAL'
                      ? 'border-[#006838] bg-emerald-50/40 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={compConfig.scope === 'NATIONAL'}
                    onChange={() => {}}
                    className="mt-1 accent-[#006838]"
                  />
                  <div>
                    <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <Flag size={14} className="text-emerald-700" /> National Level Competition
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Divided across Kenya counties (Nairobi, Mombasa, Nakuru, Garissa, Isiolo, Wajir, Mandera, Kisumu, etc.)
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setCompConfig(c => ({ ...c, scope: 'COUNTY_REGIONAL' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    compConfig.scope === 'COUNTY_REGIONAL'
                      ? 'border-[#006838] bg-emerald-50/40 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={compConfig.scope === 'COUNTY_REGIONAL'}
                    onChange={() => {}}
                    className="mt-1 accent-[#006838]"
                  />
                  <div>
                    <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <LocationIcon size={14} className="text-[#c99335]" /> County Level Competition
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Divided into regional zones within the county (Eastleigh, Kiamaiko, Komarock, Kasarani, Westlands, Kibra, South C, etc.)
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Key Event Dates & Schedules */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <Calendar size={18} className="text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                Key Event Dates & Schedules
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Define registration submission windows and round competition timeline dates
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="label">REGISTRATION OPENING DATE</label>
                <input
                  type="date"
                  value={compConfig.reg_opening_date}
                  onChange={e => setCompConfig(c => ({ ...c, reg_opening_date: e.target.value }))}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label">REGISTRATION CLOSING DATE</label>
                <input
                  type="date"
                  value={compConfig.reg_closing_date}
                  onChange={e => setCompConfig(c => ({ ...c, reg_closing_date: e.target.value }))}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label">PRELIMINARIES START DATE</label>
                <input
                  type="date"
                  value={compConfig.prelims_start_date}
                  onChange={e => setCompConfig(c => ({ ...c, prelims_start_date: e.target.value }))}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label">PRELIMINARIES END DATE (OPTIONAL)</label>
                <input
                  type="date"
                  value={compConfig.prelims_end_date}
                  onChange={e => setCompConfig(c => ({ ...c, prelims_end_date: e.target.value }))}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label">FINALS START DATE</label>
                <input
                  type="date"
                  value={compConfig.finals_start_date}
                  onChange={e => setCompConfig(c => ({ ...c, finals_start_date: e.target.value }))}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label">FINALS END DATE (OPTIONAL)</label>
                <input
                  type="date"
                  value={compConfig.finals_end_date}
                  onChange={e => setCompConfig(c => ({ ...c, finals_end_date: e.target.value }))}
                  className="input-field font-mono"
                />
              </div>
            </div>
          </div>

          {/* Venue & Location Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <LocationIcon size={18} className="text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                Venue & Location Details
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Bilingual venue descriptions shown on public pages and student admission badges
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="label">VENUE LOCATION (ENGLISH)</label>
                <input
                  value={compConfig.venue_en}
                  onChange={e => setCompConfig(c => ({ ...c, venue_en: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Jamia Mosque Multi-Purpose Hall, Nairobi, Kenya"
                />
              </div>
              <div>
                <label className="label">VENUE LOCATION (ARABIC — اتجاه RTL)</label>
                <input
                  value={compConfig.venue_ar}
                  onChange={e => setCompConfig(c => ({ ...c, venue_ar: e.target.value }))}
                  className="input-field"
                  dir="rtl"
                  placeholder="قاعة مسجد جامعة نيروبي، كينيا"
                />
              </div>
            </div>
          </div>

          {/* Official Competition Description */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <FileText size={18} className="text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                Official Competition Description
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Public overview details for participating Madrasas, candidates, and visitors
            </p>

            <div className="space-y-4 pt-4">
              <div>
                <label className="label">COMPETITION OVERVIEW (ENGLISH)</label>
                <textarea
                  rows={3}
                  value={compConfig.overview_en}
                  onChange={e => setCompConfig(c => ({ ...c, overview_en: e.target.value }))}
                  className="input-field resize-none text-xs"
                />
              </div>
              <div>
                <label className="label">COMPETITION OVERVIEW (ARABIC — اتجاه RTL)</label>
                <textarea
                  rows={3}
                  value={compConfig.overview_ar}
                  onChange={e => setCompConfig(c => ({ ...c, overview_ar: e.target.value }))}
                  className="input-field resize-none text-xs"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* Quota & Registration Capacities */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Sliders size={18} className="text-[#c99335]" />
                <h2 className="font-serif font-bold text-sm text-gray-900 uppercase tracking-wide">
                  Quota & Registration Capacities
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Limit maximum applicant submissions per category or region/county
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">PER-CATEGORY REGISTRATION LIMIT</label>
                <input
                  type="number"
                  value={compConfig.category_limit}
                  onChange={e => setCompConfig(c => ({ ...c, category_limit: Number(e.target.value) }))}
                  className="input-field font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Maximum candidates per memorisation category (5, 15, 20, 30 Juz').
                </p>
              </div>
              <div>
                <label className="label">PER-REGION / COUNTY REGISTRATION LIMIT (OPTIONAL)</label>
                <input
                  type="number"
                  value={compConfig.county_limit}
                  onChange={e => setCompConfig(c => ({ ...c, county_limit: Number(e.target.value) }))}
                  className="input-field font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Maximum candidates per zone/county.
                </p>
              </div>
            </div>

            {/* Granular Matrix Table */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                    GRANULAR {compConfig.scope === 'NATIONAL' ? 'COUNTY' : 'ZONE / REGION'} & CATEGORY LIMITS
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Set specific registration quotas for a given {compConfig.scope === 'NATIONAL' ? 'county' : 'region'} and category. Leave blank or enter Def to use the global fallback limit (defaults to 10).
                  </p>
                </div>

                {/* Add Row Controls */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <input
                    type="text"
                    placeholder={compConfig.scope === 'NATIONAL' ? 'e.g. Samburu County, Meru...' : 'e.g. South B, Ruaka...'}
                    value={newRowName}
                    onChange={e => setNewRowName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMatrixRow() } }}
                    className="input-field !py-1.5 !px-3 text-xs w-full sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={handleAddMatrixRow}
                    className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 shrink-0 font-bold"
                  >
                    <Plus size={13} /> Add Row
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-700">
                    <tr>
                      <th className="p-3 font-serif uppercase tracking-wider">{compConfig.scope === 'NATIONAL' ? 'COUNTY' : 'REGION / ZONE'}</th>
                      <th className="p-3 text-center">30 JUZ'</th>
                      <th className="p-3 text-center">20 JUZ'</th>
                      <th className="p-3 text-center">15 JUZ'</th>
                      <th className="p-3 text-center">5 JUZ'</th>
                      <th className="p-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {activeMatrixList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No rows defined. Use the &quot;Add Row&quot; field above to add {compConfig.scope === 'NATIONAL' ? 'counties' : 'regions'}.
                        </td>
                      </tr>
                    ) : (
                      activeMatrixList.map(rName => {
                        const rowLimits = compConfig.granular_limits[rName] || {}
                        return (
                          <tr key={rName} className="hover:bg-gray-50/60 transition-colors">
                            <td className="p-3 font-bold text-gray-900">{rName}</td>
                            {['30', '20', '15', '5'].map(juz => {
                              const val = rowLimits[juz] !== undefined ? rowLimits[juz] : 'Def'
                              return (
                                <td key={juz} className="p-2 text-center">
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={e => handleGranularLimitChange(rName, juz, e.target.value)}
                                    className="w-16 mx-auto text-center font-mono text-xs py-1 px-1.5 border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:border-[#006838] outline-none"
                                  />
                                </td>
                              )
                            })}
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteMatrixRow(rName)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title={`Delete ${rName} row`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Save Action Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveCompetitionConfig}
              className="btn-primary !py-3 !px-8 text-sm flex items-center gap-2 shadow-lg"
            >
              <Save size={16} /> Save Competition Configuration
            </button>
          </div>

        </div>
      )}

      {/* ─── TAB 2: Categories Management (Editable) ───────────────────────── */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <h2 className="font-serif font-bold text-sm text-gray-900">
                Active Judging Categories ({categories.length})
              </h2>
              <span className="text-xs text-gray-500 font-medium">
                Click Edit to modify category rules & age brackets
              </span>
            </div>

            <table className="w-full text-left">
              <thead className="bg-gray-50/60 border-b border-gray-200">
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">Group</th>
                  <th className="table-th">{t.category_name_en}</th>
                  <th className="table-th">{t.category_name_ar}</th>
                  <th className="table-th">Age Range</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-td text-gray-500 font-mono text-xs">#{c.id}</td>
                    <td className="table-td font-bold text-amber-700 text-xs uppercase">{c.category_group}</td>
                    <td className="table-td font-semibold text-gray-900">{c.name_en}</td>
                    <td className="table-td font-semibold text-gray-900">{c.name_ar}</td>
                    <td className="table-td text-gray-700 text-xs font-medium">{c.min_age || 0} – {c.max_age || '∞'} yrs</td>
                    <td className="table-td text-right">
                      <button
                        onClick={() => handleOpenEditCategory(c)}
                        className="btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1 ml-auto text-emerald-800"
                      >
                        <Edit size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
            <h2 className="font-serif text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-[#c99335]" /> Add New Category
            </h2>
            <form onSubmit={handleCat(onCategorySubmit)} className="space-y-3.5">
              <div>
                <label className="label">Category Group</label>
                <input {...regCat('category_group')} className="input-field" placeholder="e.g. JUZ_10_15_20" />
              </div>
              <div>
                <label className="label">Name (English)</label>
                <input {...regCat('name_en')} className="input-field" placeholder="e.g. 15 Juz' (Intermediate)" />
              </div>
              <div>
                <label className="label">Name (Arabic)</label>
                <input {...regCat('name_ar')} className="input-field" placeholder="١٥ جزءاً" dir="rtl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Min Age</label>
                  <input type="number" {...regCat('min_age')} className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="label">Max Age</label>
                  <input type="number" {...regCat('max_age')} className="input-field" placeholder="18" />
                </div>
              </div>
              <div>
                <label className="label">Display Order</label>
                <input type="number" {...regCat('display_order')} className="input-field" placeholder="1" />
              </div>
              <button type="submit" disabled={isSubCat} className="btn-primary w-full mt-3 text-xs">
                Create Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Administrators ────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="table-th">{t.user_name}</th>
                  <th className="table-th">{t.user_email}</th>
                  <th className="table-th">{t.user_role}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-td font-semibold text-gray-900">{u.name}</td>
                    <td className="table-td text-gray-600 font-mono text-xs">{u.email}</td>
                    <td className="table-td">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-semibold border border-gray-200">{u.role}</span>
                      {u.judge_role && <span className="ml-1.5 text-xs text-amber-800 font-medium">({u.judge_role})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
            <h2 className="font-serif text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus size={16} className="text-[#c99335]" /> {t.user_create}
            </h2>
            <form onSubmit={handleUser(onUserSubmit)} className="space-y-3.5">
              <div>
                <label className="label">{t.user_name}</label>
                <input {...regUser('name')} className="input-field" placeholder="Full name" />
              </div>
              <div>
                <label className="label">{t.user_email}</label>
                <input {...regUser('email')} type="email" className="input-field" placeholder="user@jmc.or.ke" dir="ltr" />
              </div>
              <div>
                <label className="label">{t.user_password}</label>
                <input {...regUser('password')} type="password" className="input-field" placeholder="••••••••" dir="ltr" />
              </div>
              <div>
                <label className="label">{t.user_role}</label>
                <select {...regUser('role')} className="input-field cursor-pointer">
                  <option value="SUPERADMIN">Super Admin</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="JUDGE">Judge</option>
                </select>
              </div>
              {userRole === 'JUDGE' && (
                <div>
                  <label className="label">{t.user_judge_role}</label>
                  <select {...regUser('judge_role')} className="input-field cursor-pointer">
                    <option value="REGULAR">Regular Judge</option>
                    <option value="GUEST_NEUTRAL">Guest Neutral Judge</option>
                  </select>
                </div>
              )}
              <div>
                <label className="label">{t.user_language}</label>
                <select {...regUser('preferred_language')} className="input-field cursor-pointer">
                  <option value="EN">English</option>
                  <option value="AR">Arabic</option>
                </select>
              </div>
              <button type="submit" disabled={isSubUser} className="btn-primary w-full mt-3 text-xs">{t.user_create}</button>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Regions ───────────────────────────────────────────────── */}
      {activeTab === 'regions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">{t.region_name_en}</th>
                  <th className="table-th">{t.region_name_ar}</th>
                  <th className="table-th">County ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {regions.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-td text-gray-500 font-mono text-xs">#{r.id}</td>
                    <td className="table-td font-semibold text-gray-900">{r.name_en}</td>
                    <td className="table-td font-semibold text-gray-900">{r.name_ar}</td>
                    <td className="table-td text-gray-600">{r.county_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
            <h2 className="font-serif text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-[#c99335]" /> {t.regions_add}
            </h2>
            <form onSubmit={handleRegion(onRegionSubmit)} className="space-y-3.5">
              <div>
                <label className="label">{t.region_name_en}</label>
                <input {...regRegion('name_en')} className="input-field" placeholder="e.g. Eastleigh Regional Zone" dir="ltr" />
              </div>
              <div>
                <label className="label">{t.region_name_ar}</label>
                <input {...regRegion('name_ar')} className="input-field" placeholder="منطقة إيستلي" dir="rtl" />
              </div>
              <div>
                <label className="label">{t.region_county}</label>
                <input type="number" {...regRegion('county_id')} className="input-field" placeholder="County code" dir="ltr" />
              </div>
              <button type="submit" disabled={isSubRegion} className="btn-primary w-full mt-3 text-xs">{tc.save}</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      <Modal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} title={`Edit Category — ${editingCategory?.name_en}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Category Group</label>
            <input value={catGroup} onChange={e => setCatGroup(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Name (English)</label>
            <input value={catNameEn} onChange={e => setCatNameEn(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Name (Arabic)</label>
            <input value={catNameAr} onChange={e => setCatNameAr(e.target.value)} className="input-field" dir="rtl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Minimum Age</label>
              <input type="number" value={catMinAge} onChange={e => setCatMinAge(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Maximum Age</label>
              <input type="number" value={catMaxAge} onChange={e => setCatMaxAge(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Display Order</label>
            <input type="number" value={catOrder} onChange={e => setCatOrder(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setEditingCategory(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveEditCategory} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
