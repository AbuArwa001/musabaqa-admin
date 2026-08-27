'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  createAdminUser, createRegion, updateRegion, deleteRegion,
  listCounties, createCounty, updateCounty, deleteCounty,
  createCategory, updateCategory, getCompetitionConfig, saveCompetitionConfig,
  listCompetitions, createCompetition, updateCompetition, deleteCompetition,
  setCurrentCompetition, addCompetitionGalleryItem, deleteCompetitionGalleryItem,
  replicateCompetitionToJamiaEvents,
  type Region, type County, type Category, type AdminUserRead, type CompetitionConfig,
  type Competition, type CompetitionStatus, type HostOrganization, type GalleryItem, type CategoryWinnersPodium
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import {
  UserPlus, MapPin, List, Settings, Trophy, Calendar, FileText, Sliders, Save,
  Globe, Flag, Edit, Plus, Check, Trash2, ShieldCheck, AlertCircle,
  Image as ImageIcon, Sparkles, Award, Medal, Share2, Copy, ExternalLink,
  Eye, ChevronRight, CheckCircle2, Building, RefreshCw, X, Layers, Clock
} from 'lucide-react'
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

const countySchema = z.object({
  name: z.string().min(2),
})

const categorySchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  category_group: z.string().min(2),
  min_age: z.string().optional(),
  max_age: z.string().min(1),
  display_order: z.string().min(1),
})

const DEFAULT_NATIONAL_COUNTIES = [
  'Nairobi County', 'Mombasa County', 'Nakuru County', 'Garissa County',
  'Isiolo County', 'Mandera County', 'Wajir County', 'Kisumu County',
  'Kilifi County', 'Lamu County', 'Kajiado County'
]

export default function SettingsClient({ 
  regions: initialRegions,
  counties: initialCounties = [],
  categories: initialCategories,
  users: initialUsers,
  competitions: initialCompetitions = [],
  dict,
  locale,
  token 
}: { 
  regions: Region[],
  counties?: County[],
  categories: Category[],
  users: AdminUserRead[],
  competitions?: Competition[],
  dict: Dict,
  locale: string,
  token: string 
}) {
  const t = dict.settings
  const tc = dict.common
  const isAr = locale === 'ar'

  const [activeTab, setActiveTab] = useState<'config' | 'competitions' | 'categories' | 'users' | 'regions'>('config')
  const [users, setUsers] = useState(initialUsers)
  const [regions, setRegions] = useState<Region[]>(initialRegions)
  const [counties, setCounties] = useState<County[]>(initialCounties)
  const [categories, setCategories] = useState(initialCategories)
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions)

  // Competition Config state
  const [compConfig, setCompConfig] = useState<CompetitionConfig>(getCompetitionConfig())
  const isNational = compConfig.scope === 'NATIONAL'

  // Competition Editions Hub State
  const [compFilterStatus, setCompFilterStatus] = useState<string>('ALL')
  const [compFilterHost, setCompFilterHost] = useState<string>('ALL')

  // Selected Competition for Modals
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null)
  const [isCompModalOpen, setIsCompModalOpen] = useState(false)
  const [isCreatingNewComp, setIsCreatingNewComp] = useState(false)

  // Competition Form State
  const [compTitleEn, setCompTitleEn] = useState('')
  const [compTitleAr, setCompTitleAr] = useState('')
  const [compEditionLabel, setCompEditionLabel] = useState('')
  const [compYear, setCompYear] = useState<number>(2026)
  const [compHostOrg, setCompHostOrg] = useState<HostOrganization>('JAMIA_MOSQUE')
  const [compHostNameEn, setCompHostNameEn] = useState('Jamia Mosque Committee · Nairobi')
  const [compHostNameAr, setCompHostNameAr] = useState('لجنة مسجد جامعة نيروبي')
  const [compStatus, setCompStatus] = useState<CompetitionStatus>('ACTIVE')
  const [compScope, setCompScope] = useState<'NATIONAL' | 'COUNTY_REGIONAL'>('COUNTY_REGIONAL')
  const [compStartDate, setCompStartDate] = useState('')
  const [compEndDate, setCompEndDate] = useState('')
  const [compRegDeadline, setCompRegDeadline] = useState('')
  const [compGrandFinale, setCompGrandFinale] = useState('')
  const [compVenueEn, setCompVenueEn] = useState('Jamia Mosque Multi-Purpose Hall, Nairobi, Kenya')
  const [compVenueAr, setCompVenueAr] = useState('قاعة مسجد الجامعة متعددة الأغراض، نيروبي، كينيا')
  const [compBannerUrl, setCompBannerUrl] = useState('')
  const [compThemeImgUrl, setCompThemeImgUrl] = useState('')
  const [compDescEn, setCompDescEn] = useState('')
  const [compDescAr, setCompDescAr] = useState('')

  // Gallery Modal State
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [galleryPhotoUrl, setGalleryPhotoUrl] = useState('')
  const [galleryPhotoTitle, setGalleryPhotoTitle] = useState('')
  const [galleryPhotoCaption, setGalleryPhotoCaption] = useState('')
  const [galleryPhotoStage, setGalleryPhotoStage] = useState('General')

  // Podium Winners Modal State
  const [isPodiumModalOpen, setIsPodiumModalOpen] = useState(false)
  const [podiumData, setPodiumData] = useState<any[]>([])

  // Jamia Events Replication Modal State
  const [isReplicationModalOpen, setIsReplicationModalOpen] = useState(false)
  const [replicationPayload, setReplicationPayload] = useState<any>(null)
  const [isReplicating, setIsReplicating] = useState(false)

  // Category Edit state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [catNameEn, setCatNameEn] = useState('')
  const [catNameAr, setCatNameAr] = useState('')
  const [catGroup, setCatGroup] = useState('')
  const [catMinAge, setCatMinAge] = useState<string>('0')
  const [catMaxAge, setCatMaxAge] = useState<string>('99')
  const [catOrder, setCatOrder] = useState<string>('1')

  // Region / County Edit state
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)
  const [editRegionNameEn, setEditRegionNameEn] = useState('')
  const [editRegionNameAr, setEditRegionNameAr] = useState('')
  const [editRegionCountyId, setEditRegionCountyId] = useState<string>('1')

  const [editingCounty, setEditingCounty] = useState<County | null>(null)
  const [editCountyName, setEditCountyName] = useState('')

  // Matrix Row Add state
  const [newRowName, setNewRowName] = useState('')
  
  const { register: regUser, handleSubmit: handleUser, reset: resetUser, watch: watchUser, formState: { isSubmitting: isSubUser } } = useForm<z.infer<typeof userSchema>>({ resolver: zodResolver(userSchema) })
  const { register: regRegion, handleSubmit: handleRegion, reset: resetRegion, formState: { isSubmitting: isSubRegion } } = useForm<z.infer<typeof regionSchema>>({ resolver: zodResolver(regionSchema) })
  const { register: regCounty, handleSubmit: handleCounty, reset: resetCounty, formState: { isSubmitting: isSubCounty } } = useForm<z.infer<typeof countySchema>>({ resolver: zodResolver(countySchema) })
  const { register: regCat, handleSubmit: handleCat, reset: resetCat, formState: { isSubmitting: isSubCat } } = useForm<z.infer<typeof categorySchema>>({ resolver: zodResolver(categorySchema) })

  const userRole = watchUser('role')

  useEffect(() => {
    setCompConfig(getCompetitionConfig())
  }, [])

  // Auto-sync initial counties if database counties was empty but national_rows existed
  useEffect(() => {
    if (initialCounties.length === 0 && compConfig.national_rows && compConfig.national_rows.length > 0) {
      setCounties(compConfig.national_rows.map((name, idx) => ({ id: idx + 1, name, active: true })))
    }
  }, [initialCounties, compConfig.national_rows])

  // Active matrix locations derived directly from harmonized state
  const activeMatrixList: string[] = isNational
    ? (counties.length > 0 ? counties.map(c => c.name) : compConfig.national_rows || DEFAULT_NATIONAL_COUNTIES)
    : (regions.length > 0 ? regions.map(r => r.name_en) : compConfig.county_rows || ['Eastleigh', 'Kasarani', 'South B', 'Langata', 'Embakasi', 'Westlands', 'Pumwani', 'Kajiado Town', 'Kitengela', 'Ngong'])

  // ─── Competition Editions Handlers ──────────────────────────────────────────

  const handleOpenNewCompetition = () => {
    setIsCreatingNewComp(true)
    setSelectedComp(null)
    setCompTitleEn('')
    setCompTitleAr('')
    setCompEditionLabel(`Edition (${new Date().getFullYear()})`)
    setCompYear(new Date().getFullYear())
    setCompHostOrg('JAMIA_MOSQUE')
    setCompHostNameEn('Jamia Mosque Committee · Nairobi')
    setCompHostNameAr('لجنة مسجد جامعة نيروبي')
    setCompStatus('DRAFT')
    setCompScope('COUNTY_REGIONAL')
    setCompStartDate('')
    setCompEndDate('')
    setCompRegDeadline('')
    setCompGrandFinale('')
    setCompVenueEn('Jamia Mosque Multi-Purpose Hall, Nairobi, Kenya')
    setCompVenueAr('قاعة مسجد الجامعة متعددة الأغراض، نيروبي، كينيا')
    setCompBannerUrl('https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1600&q=80')
    setCompThemeImgUrl('https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1200&q=80')
    setCompDescEn('')
    setCompDescAr('')
    setIsCompModalOpen(true)
  }

  const handleOpenEditCompetition = (comp: Competition) => {
    setIsCreatingNewComp(false)
    setSelectedComp(comp)
    setCompTitleEn(comp.title_en)
    setCompTitleAr(comp.title_ar || '')
    setCompEditionLabel(comp.edition_label || '')
    setCompYear(comp.year || 2026)
    setCompHostOrg(comp.host_org)
    setCompHostNameEn(comp.host_org_name_en || '')
    setCompHostNameAr(comp.host_org_name_ar || '')
    setCompStatus(comp.status)
    setCompScope(comp.scope || 'COUNTY_REGIONAL')
    setCompStartDate(comp.start_date || '')
    setCompEndDate(comp.end_date || '')
    setCompRegDeadline(comp.registration_deadline || '')
    setCompGrandFinale(comp.grand_finale_date || '')
    setCompVenueEn(comp.venue_en || '')
    setCompVenueAr(comp.venue_ar || '')
    setCompBannerUrl(comp.banner_url || '')
    setCompThemeImgUrl(comp.theme_image_url || '')
    setCompDescEn(comp.description_en || '')
    setCompDescAr(comp.description_ar || '')
    setIsCompModalOpen(true)
  }

  const handleSaveCompetition = async () => {
    if (!compTitleEn.trim()) {
      toast.error('Please enter a competition title in English')
      return
    }

    const payload: Partial<Competition> = {
      title_en: compTitleEn.trim(),
      title_ar: compTitleAr.trim(),
      edition_label: compEditionLabel.trim(),
      year: Number(compYear) || 2026,
      host_org: compHostOrg,
      host_org_name_en: compHostNameEn.trim(),
      host_org_name_ar: compHostNameAr.trim(),
      status: compStatus,
      scope: compScope,
      start_date: compStartDate || null,
      end_date: compEndDate || null,
      registration_deadline: compRegDeadline || null,
      grand_finale_date: compGrandFinale || null,
      venue_en: compVenueEn.trim(),
      venue_ar: compVenueAr.trim(),
      banner_url: compBannerUrl.trim() || null,
      theme_image_url: compThemeImgUrl.trim() || null,
      description_en: compDescEn.trim() || null,
      description_ar: compDescAr.trim() || null,
    }

    try {
      if (isCreatingNewComp) {
        const created = await createCompetition(token, payload)
        setCompetitions(prev => [created, ...prev])
        toast.success(`Competition edition "${created.title_en}" created successfully!`)
      } else if (selectedComp) {
        const updated = await updateCompetition(token, selectedComp.id, payload)
        setCompetitions(prev => prev.map(c => c.id === selectedComp.id ? updated : c))
        toast.success(`Competition edition updated successfully!`)
      }
      setIsCompModalOpen(false)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save competition edition')
    }
  }

  const handleSetCurrent = async (comp: Competition) => {
    try {
      const updated = await setCurrentCompetition(token, comp.id)
      setCompetitions(prev => prev.map(c => ({
        ...c,
        is_current: c.id === comp.id,
        status: c.id === comp.id && c.status === 'DRAFT' ? 'ACTIVE' : c.status
      })))
      
      // Update client-side competition config scope to match
      const nextConfig = { ...compConfig, scope: comp.scope }
      setCompConfig(nextConfig)
      saveCompetitionConfig(nextConfig)

      toast.success(`Switched active competition to "${comp.title_en}"`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to set current competition')
    }
  }

  const handleDeleteComp = async (comp: Competition) => {
    if (!confirm(`Are you sure you want to delete "${comp.title_en}"? This action cannot be undone.`)) return
    try {
      await deleteCompetition(token, comp.id)
      setCompetitions(prev => prev.filter(c => c.id !== comp.id))
      toast.success(`Deleted competition edition`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete competition edition')
    }
  }

  // ─── Gallery Handlers ───────────────────────────────────────────────────────

  const handleOpenGallery = (comp: Competition) => {
    setSelectedComp(comp)
    setGalleryPhotoUrl('')
    setGalleryPhotoTitle('')
    setGalleryPhotoCaption('')
    setGalleryPhotoStage('General')
    setIsGalleryModalOpen(true)
  }

  const handleAddGalleryPhoto = async () => {
    if (!selectedComp) return
    if (!galleryPhotoUrl.trim()) {
      toast.error('Please enter a valid image URL')
      return
    }

    try {
      const updated = await addCompetitionGalleryItem(token, selectedComp.id, {
        url: galleryPhotoUrl.trim(),
        title: galleryPhotoTitle.trim() || 'Competition Photo',
        caption: galleryPhotoCaption.trim(),
        stage: galleryPhotoStage,
      })
      setSelectedComp(updated)
      setCompetitions(prev => prev.map(c => c.id === selectedComp.id ? updated : c))
      toast.success('Photo added to gallery')
      setGalleryPhotoUrl('')
      setGalleryPhotoTitle('')
      setGalleryPhotoCaption('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to add photo')
    }
  }

  const handleDeleteGalleryPhoto = async (itemId: string) => {
    if (!selectedComp) return
    try {
      const updated = await deleteCompetitionGalleryItem(token, selectedComp.id, itemId)
      setSelectedComp(updated)
      setCompetitions(prev => prev.map(c => c.id === selectedComp.id ? updated : c))
      toast.success('Photo removed from gallery')
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete photo')
    }
  }

  // ─── Podium Winners Handlers ────────────────────────────────────────────────

  const handleOpenPodium = (comp: Competition) => {
    setSelectedComp(comp)
    setPodiumData(comp.winners || [])
    setIsPodiumModalOpen(true)
  }

  // ─── Jamia Event Replication Handlers ───────────────────────────────────────

  const handleOpenReplication = async (comp: Competition) => {
    setSelectedComp(comp)
    setIsReplicating(true)
    setIsReplicationModalOpen(true)
    try {
      const rep = await replicateCompetitionToJamiaEvents(token, comp.id)
      setReplicationPayload(rep)
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate event replication payload')
    } finally {
      setIsReplicating(false)
    }
  }

  const handleCopyReplicationPayload = () => {
    if (!replicationPayload) return
    navigator.clipboard.writeText(JSON.stringify(replicationPayload.payload_ready_for_jamia_events, null, 2))
    toast.success('Event replication payload copied to clipboard!')
  }

  // ─── Admin Users & Categories Handlers ──────────────────────────────────────

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
      setRegions(prev => [...prev, created])
      
      setCompConfig(prev => {
        const existing = prev.county_rows || []
        const newRows = existing.includes(created.name_en) ? existing : [...existing, created.name_en]
        const newLimits = { ...prev.granular_limits }
        if (!newLimits[created.name_en]) {
          newLimits[created.name_en] = { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' }
        }
        const updated = { ...prev, county_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(updated)
        return updated
      })

      toast.success(`Region "${created.name_en}" added to database & quota matrix`)
      resetRegion()
    } catch (e: any) { toast.error(e.message || tc.error) }
  }

  const onCountySubmit = async (data: z.infer<typeof countySchema>) => {
    try {
      const created = await createCounty(token, { name: data.name, active: true })
      setCounties(prev => [...prev, created])

      setCompConfig(prev => {
        const existing = prev.national_rows || []
        const newRows = existing.includes(created.name) ? existing : [...existing, created.name]
        const newLimits = { ...prev.granular_limits }
        if (!newLimits[created.name]) {
          newLimits[created.name] = { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' }
        }
        const updated = { ...prev, national_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(updated)
        return updated
      })

      toast.success(`County "${created.name}" added to database & quota matrix`)
      resetCounty()
    } catch (e: any) {
      const fallbackId = Date.now()
      const fallbackItem = { id: fallbackId, name: data.name, active: true }
      setCounties(prev => [...prev, fallbackItem])
      setCompConfig(prev => {
        const existing = prev.national_rows || []
        const newRows = existing.includes(data.name) ? existing : [...existing, data.name]
        const newLimits = { ...prev.granular_limits }
        if (!newLimits[data.name]) newLimits[data.name] = { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' }
        const updated = { ...prev, national_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(updated)
        return updated
      })
      toast.success(`County "${data.name}" added`)
      resetCounty()
    }
  }

  const handleOpenEditRegion = (r: Region) => {
    setEditingRegion(r)
    setEditRegionNameEn(r.name_en)
    setEditRegionNameAr(r.name_ar)
    setEditRegionCountyId(String(r.county_id || '1'))
  }

  const handleSaveEditRegion = async () => {
    if (!editingRegion) return
    const oldName = editingRegion.name_en
    const newName = editRegionNameEn.trim()
    try {
      const updated = await updateRegion(token, editingRegion.id, {
        name_en: newName,
        name_ar: editRegionNameAr.trim(),
        county_id: Number(editRegionCountyId) || 1,
      })
      setRegions(prev => prev.map(r => r.id === editingRegion.id ? updated : r))

      if (oldName !== newName) {
        setCompConfig(prev => {
          const newRows = (prev.county_rows || []).map(r => r === oldName ? newName : r)
          const newLimits = { ...prev.granular_limits }
          if (newLimits[oldName]) {
            newLimits[newName] = newLimits[oldName]
            delete newLimits[oldName]
          }
          const nextConfig = { ...prev, county_rows: newRows, granular_limits: newLimits }
          saveCompetitionConfig(nextConfig)
          return nextConfig
        })
      }
      toast.success('Region updated successfully')
      setEditingRegion(null)
    } catch (e: any) { toast.error(e.message || 'Failed to update region') }
  }

  const handleDeleteRegion = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete region "${name}"?`)) return
    try {
      await deleteRegion(token, id)
    } catch (e) {
      console.warn('API delete warning:', e)
    }
    setRegions(prev => prev.filter(r => r.id !== id))
    setCompConfig(prev => {
      const newRows = (prev.county_rows || []).filter(r => r !== name)
      const newLimits = { ...prev.granular_limits }
      delete newLimits[name]
      const nextConfig = { ...prev, county_rows: newRows, granular_limits: newLimits }
      saveCompetitionConfig(nextConfig)
      return nextConfig
    })
    toast.success(`Deleted region "${name}"`)
  }

  const handleOpenEditCounty = (c: County) => {
    setEditingCounty(c)
    setEditCountyName(c.name)
  }

  const handleSaveEditCounty = async () => {
    if (!editingCounty) return
    const oldName = editingCounty.name
    const newName = editCountyName.trim()
    try {
      const updated = await updateCounty(token, editingCounty.id, { name: newName })
      setCounties(prev => prev.map(c => c.id === editingCounty.id ? updated : c))

      if (oldName !== newName) {
        setCompConfig(prev => {
          const newRows = (prev.national_rows || []).map(r => r === oldName ? newName : r)
          const newLimits = { ...prev.granular_limits }
          if (newLimits[oldName]) {
            newLimits[newName] = newLimits[oldName]
            delete newLimits[oldName]
          }
          const nextConfig = { ...prev, national_rows: newRows, granular_limits: newLimits }
          saveCompetitionConfig(nextConfig)
          return nextConfig
        })
      }
      toast.success('County updated successfully')
      setEditingCounty(null)
    } catch (e: any) {
      setCounties(prev => prev.map(c => c.id === editingCounty.id ? { ...c, name: newName } : c))
      setCompConfig(prev => {
        const newRows = (prev.national_rows || []).map(r => r === oldName ? newName : r)
        const newLimits = { ...prev.granular_limits }
        if (newLimits[oldName]) {
          newLimits[newName] = newLimits[oldName]
          delete newLimits[oldName]
        }
        const nextConfig = { ...prev, national_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(nextConfig)
        return nextConfig
      })
      toast.success('County updated')
      setEditingCounty(null)
    }
  }

  const handleDeleteCounty = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete county "${name}"?`)) return
    try {
      await deleteCounty(token, id)
    } catch (e) {
      console.warn('API delete warning:', e)
    }
    setCounties(prev => prev.filter(c => c.id !== id))
    setCompConfig(prev => {
      const newRows = (prev.national_rows || []).filter(r => r !== name)
      const newLimits = { ...prev.granular_limits }
      delete newLimits[name]
      const nextConfig = { ...prev, national_rows: newRows, granular_limits: newLimits }
      saveCompetitionConfig(nextConfig)
      return nextConfig
    })
    toast.success(`Deleted county "${name}"`)
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
    const updatedConfig: CompetitionConfig = {
      ...compConfig,
      national_rows: counties.length > 0 ? counties.map(c => c.name) : (compConfig.national_rows || DEFAULT_NATIONAL_COUNTIES),
      county_rows: regions.length > 0 ? regions.map(r => r.name_en) : (compConfig.county_rows || []),
    }
    saveCompetitionConfig(updatedConfig)
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

  const handleAddMatrixRow = async () => {
    const trimmed = newRowName.trim()
    if (!trimmed) {
      toast.error('Please enter a name for the county or region row')
      return
    }
    if (activeMatrixList.includes(trimmed)) {
      toast.error(`"${trimmed}" is already in the matrix`)
      return
    }

    if (isNational) {
      try {
        const created = await createCounty(token, { name: trimmed, active: true })
        setCounties(prev => [...prev, created])
      } catch {
        setCounties(prev => [...prev, { id: Date.now(), name: trimmed, active: true }])
      }
      setCompConfig(prev => {
        const existing = prev.national_rows || []
        const newRows = [...existing, trimmed]
        const newLimits = { ...prev.granular_limits }
        newLimits[trimmed] = { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' }
        const next = { ...prev, national_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(next)
        return next
      })
    } else {
      try {
        const created = await createRegion(token, { name_en: trimmed, name_ar: trimmed, county_id: 1 })
        setRegions(prev => [...prev, created])
      } catch {
        setRegions(prev => [...prev, { id: Date.now(), name_en: trimmed, name_ar: trimmed, county_id: 1 }])
      }
      setCompConfig(prev => {
        const existing = prev.county_rows || []
        const newRows = [...existing, trimmed]
        const newLimits = { ...prev.granular_limits }
        newLimits[trimmed] = { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' }
        const next = { ...prev, county_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(next)
        return next
      })
    }

    toast.success(`Added "${trimmed}" to quota matrix & locations list`)
    setNewRowName('')
  }

  const handleDeleteMatrixRow = async (rowName: string) => {
    if (isNational) {
      const match = counties.find(c => c.name === rowName)
      if (match) {
        try { await deleteCounty(token, match.id) } catch {}
        setCounties(prev => prev.filter(c => c.id !== match.id))
      }
      setCompConfig(prev => {
        const existing = prev.national_rows || activeMatrixList
        const newRows = existing.filter(r => r !== rowName)
        const newLimits = { ...prev.granular_limits }
        delete newLimits[rowName]
        const next = { ...prev, national_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(next)
        return next
      })
    } else {
      const match = regions.find(r => r.name_en === rowName)
      if (match) {
        try { await deleteRegion(token, match.id) } catch {}
        setRegions(prev => prev.filter(r => r.id !== match.id))
      }
      setCompConfig(prev => {
        const existing = prev.county_rows || activeMatrixList
        const newRows = existing.filter(r => r !== rowName)
        const newLimits = { ...prev.granular_limits }
        delete newLimits[rowName]
        const next = { ...prev, county_rows: newRows, granular_limits: newLimits }
        saveCompetitionConfig(next)
        return next
      })
    }
    toast.success(`Removed "${rowName}" from quota matrix & locations`)
  }

  // Filtered Competitions
  const filteredCompetitions = competitions.filter(c => {
    if (compFilterStatus !== 'ALL' && c.status !== compFilterStatus) return false
    if (compFilterHost !== 'ALL' && c.host_org !== compFilterHost) return false
    return true
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Competition & System Settings"
        subtitle="Manage event editions, competition history, theme galleries, quota capacities, regions, judging categories, and staff accounts"
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
          onClick={() => setActiveTab('competitions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'competitions'
              ? 'bg-[#006838] text-white border-[#004d29] shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <Layers size={14} className={activeTab === 'competitions' ? 'text-[#c99335]' : 'text-emerald-700'} />
          <span>Editions & History ({competitions.length})</span>
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
          {isNational ? <Flag size={14} className={activeTab === 'regions' ? 'text-white' : 'text-emerald-700'} /> : <MapPin size={14} className={activeTab === 'regions' ? 'text-white' : 'text-[#c99335]'} />}
          <span>{isNational ? `Counties & Locations (${counties.length})` : `Regions & Zones (${regions.length})`}</span>
        </button>
      </div>

      {/* ─── TAB 1: Competition Configuration ─────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
            
            {/* Header / Active Edition Indicator */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 inline-flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Competition Settings
                </span>
                <h2 className="font-serif text-lg font-bold text-gray-900">
                  {compConfig.scope === 'NATIONAL' ? 'National Level Competition Rules' : 'Nairobi County Regional Competition Rules'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set event timelines, regional quota caps, and per-zone capacity constraints for the current active competition.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('competitions')}
                  className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5 font-bold"
                >
                  <Layers size={13} /> Switch Edition ({competitions.length})
                </button>
                <button
                  onClick={handleSaveCompetitionConfig}
                  className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 shadow-sm font-bold"
                >
                  <Save size={14} /> Save Configuration
                </button>
              </div>
            </div>

            {/* Scope Selector */}
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200">
              <label className="label !mb-2 flex items-center gap-1.5">
                <Globe size={14} className="text-[#c99335]" />
                <span>COMPETITION GEOGRAPHIC SCOPE</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div
                  onClick={() => setCompConfig(c => ({ ...c, scope: 'COUNTY_REGIONAL' }))}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    compConfig.scope === 'COUNTY_REGIONAL'
                      ? 'border-[#006838] bg-emerald-50/50 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
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
                    <p className="font-bold text-xs text-gray-900">County Level Competition</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Divided into regional zones within a county (e.g. Eastleigh, Kasarani, South B, Langata).
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setCompConfig(c => ({ ...c, scope: 'NATIONAL' }))}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    compConfig.scope === 'NATIONAL'
                      ? 'border-[#006838] bg-emerald-50/50 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
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
                    <p className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span>National Level Competition</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">Kenya Counties</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Organized across Kenya&apos;s counties (Nairobi, Mombasa, Nakuru, Garissa, etc.).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quota Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">GLOBAL DEFAULT QUOTA (PER ZONE / CATEGORY)</label>
                <input
                  type="number"
                  value={compConfig.category_limit}
                  onChange={e => setCompConfig(c => ({ ...c, category_limit: Number(e.target.value) }))}
                  className="input-field font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Default registration ceiling when no granular exception is set.
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
              className="btn-primary !py-3 !px-8 text-sm flex items-center gap-2 shadow-lg font-bold"
            >
              <Save size={16} /> Save Competition Configuration
            </button>
          </div>

        </div>
      )}

      {/* ─── TAB 2: Editions & Competition History ────────────────────────── */}
      {activeTab === 'competitions' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <div>
              <h2 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
                <Layers size={18} className="text-[#c99335]" />
                <span>Competition Editions & History Archive</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage live editions, past concluded competitions, theme banners, photo galleries, and winners podiums.
              </p>
            </div>

            <button
              onClick={handleOpenNewCompetition}
              className="btn-primary !py-2.5 !px-4 text-xs flex items-center gap-1.5 font-bold shrink-0 shadow-sm"
            >
              <Plus size={15} /> Create Competition Edition
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-xs text-xs">
              <span className="text-gray-400 px-2 font-medium">Status:</span>
              {(['ALL', 'ACTIVE', 'CONCLUDED', 'DRAFT'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setCompFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    compFilterStatus === st
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {st === 'ALL' && 'All Statuses'}
                  {st === 'ACTIVE' && '🟢 Live & Active'}
                  {st === 'CONCLUDED' && '🔵 Concluded & Archived'}
                  {st === 'DRAFT' && '🟡 Draft & Setup'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-xs text-xs">
              <span className="text-gray-400 px-2 font-medium">Host:</span>
              {(['ALL', 'JAMIA_MOSQUE', 'RELIGIOUS_ATTACHE'] as const).map(host => (
                <button
                  key={host}
                  onClick={() => setCompFilterHost(host)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    compFilterHost === host
                      ? 'bg-[#006838] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {host === 'ALL' && 'All Organizers'}
                  {host === 'JAMIA_MOSQUE' && '🕌 Jamia Mosque'}
                  {host === 'RELIGIOUS_ATTACHE' && '🇸🇦 Religious Attaché'}
                </button>
              ))}
            </div>
          </div>

          {/* Competitions Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompetitions.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white border border-gray-200 rounded-2xl p-8">
                <Layers size={36} className="mx-auto text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-700 text-sm">No competition editions found</h3>
                <p className="text-xs text-gray-400 mt-1">Create a new competition edition to get started.</p>
              </div>
            ) : (
              filteredCompetitions.map(comp => {
                const isCur = comp.is_current
                const isEnded = comp.status === 'CONCLUDED'
                const isDraft = comp.status === 'DRAFT'
                const isAttache = comp.host_org === 'RELIGIOUS_ATTACHE'

                return (
                  <div
                    key={comp.id}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col ${
                      isCur
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-gray-200'
                    }`}
                  >
                    {/* Card Top Banner */}
                    <div className="relative h-36 w-full bg-gray-900 overflow-hidden group">
                      {comp.theme_image_url || comp.banner_url ? (
                        <img
                          src={comp.theme_image_url || comp.banner_url || ''}
                          alt={comp.title_en}
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-950 to-gray-900 flex items-center justify-center">
                          <Trophy size={32} className="text-[#c99335]/40" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        {/* Status Badge */}
                        <div>
                          {comp.status === 'ACTIVE' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white flex items-center gap-1.5 shadow-sm backdrop-blur-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                              Live & Active
                            </span>
                          )}
                          {comp.status === 'CONCLUDED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600/90 text-white flex items-center gap-1 shadow-sm backdrop-blur-xs">
                              <CheckCircle2 size={12} /> Concluded & Archived
                            </span>
                          )}
                          {comp.status === 'DRAFT' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/90 text-white flex items-center gap-1 shadow-sm backdrop-blur-xs">
                              <Clock size={12} /> Draft & Setup
                            </span>
                          )}
                        </div>

                        {/* Active Competition Indicator */}
                        {isCur && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#c99335] text-white shadow-sm flex items-center gap-1">
                            <Sparkles size={11} /> Active Current
                          </span>
                        )}
                      </div>

                      {/* Bottom Banner Title */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {comp.edition_label || `${comp.year} Edition`}
                        </span>
                        <h3 className="text-white font-bold text-sm leading-snug line-clamp-1 drop-shadow-sm">
                          {comp.title_en}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {/* Arabic Title */}
                        {comp.title_ar && (
                          <p className="text-xs text-gray-500 font-serif line-clamp-1 text-right" dir="rtl">
                            {comp.title_ar}
                          </p>
                        )}

                        {/* Host Organization Badge */}
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                          <span className="text-base">{isAttache ? '🇸🇦' : '🕌'}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 truncate text-[11px]">{comp.host_org_name_en}</p>
                            <p className="text-[10px] text-gray-500 truncate">{comp.scope === 'NATIONAL' ? 'National Scope (47 Counties)' : 'County Level Regional Scope'}</p>
                          </div>
                        </div>

                        {/* Event Details snippet */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#c99335] shrink-0" />
                            <span className="truncate">{comp.start_date || 'TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-emerald-700 shrink-0" />
                            <span className="truncate">{comp.venue_en ? comp.venue_en.split(',')[0] : 'Jamia Mosque'}</span>
                          </div>
                        </div>

                        {/* Gallery & Winners count */}
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-500 font-medium border-t border-gray-100">
                          <span className="flex items-center gap-1">
                            <ImageIcon size={12} className="text-gray-400" />
                            {comp.gallery?.length || 0} Photos
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy size={12} className="text-amber-500" />
                            {comp.winners?.length ? `${comp.winners.length} Winner Tiers` : 'Podium Ready'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Grid */}
                      <div className="space-y-1.5 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleOpenPodium(comp)}
                            className="py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trophy size={12} className="text-amber-600" /> Podium
                          </button>

                          <button
                            onClick={() => handleOpenGallery(comp)}
                            className="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/60 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <ImageIcon size={12} className="text-emerald-600" /> Gallery
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleOpenEditCompetition(comp)}
                            className="py-1.5 px-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit size={12} /> Edit Details
                          </button>

                          <button
                            onClick={() => handleOpenReplication(comp)}
                            className="py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/60 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Replicate event to jamia-admin"
                          >
                            <Share2 size={12} className="text-indigo-600" /> Replicate
                          </button>
                        </div>

                        {/* Set as Active / Delete row */}
                        <div className="flex items-center justify-between pt-1">
                          {!isCur ? (
                            <button
                              onClick={() => handleSetCurrent(comp)}
                              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <CheckCircle2 size={12} /> Set as Active Competition
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <Check size={12} /> Active Current Edition
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteComp(comp)}
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete edition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Categories Management ─────────────────────────────────── */}
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
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#c99335] hover:bg-amber-50 transition-colors"
                        title={`Edit ${c.name_en}`}
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
            <h2 className="font-serif text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <List size={16} className="text-[#c99335]" /> Create Category
            </h2>
            <form onSubmit={handleCat(onCategorySubmit)} className="space-y-3.5">
              <div>
                <label className="label">Category Group</label>
                <select {...regCat('category_group')} className="input-field cursor-pointer">
                  <option value="JUZ_30">Juz 30 (Full Quran)</option>
                  <option value="JUZ_10_15_20">Juz 10, 15, 20</option>
                  <option value="JUZ_1_5">Juz 1, 5</option>
                </select>
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

      {/* ─── TAB 4: Administrators ────────────────────────────────────────── */}
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

      {/* ─── TAB 5: Regions & Zones / Counties & Locations ───────────────── */}
      {activeTab === 'regions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-sm text-gray-900 flex items-center gap-2">
                  {isNational ? <Flag size={15} className="text-emerald-700" /> : <MapPin size={15} className="text-[#c99335]" />}
                  <span>{isNational ? `Configured Competition Counties (${counties.length})` : `Configured Regional Zones (${regions.length})`}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isNational
                    ? 'Counties synced with the National Competition Quota Matrix & Candidate Filters'
                    : 'Regional zones synced with the County Competition Quota Matrix & Candidate Filters'}
                </p>
              </div>
            </div>

            <table className="w-full text-left">
              <thead className="bg-gray-50/60 border-b border-gray-200">
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">{isNational ? 'County / Location' : t.region_name_en}</th>
                  {!isNational && <th className="table-th">{t.region_name_ar}</th>}
                  {!isNational && <th className="table-th">County ID</th>}
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isNational ? (
                  counties.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">
                        No counties configured yet. Use the form to add counties.
                      </td>
                    </tr>
                  ) : (
                    counties.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="table-td text-gray-500 font-mono text-xs">#{c.id}</td>
                        <td className="table-td font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-sm">🇰🇪</span> {c.name}
                        </td>
                        <td className="table-td text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditCounty(c)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              title={`Edit ${c.name}`}
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteCounty(c.id, c.name)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title={`Delete ${c.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  regions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No regions configured yet. Use the form to add regions.
                      </td>
                    </tr>
                  ) : (
                    regions.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="table-td text-gray-500 font-mono text-xs">#{r.id}</td>
                        <td className="table-td font-semibold text-gray-900">{r.name_en}</td>
                        <td className="table-td font-semibold text-gray-900" dir="rtl">{r.name_ar}</td>
                        <td className="table-td text-gray-600 font-mono text-xs">{r.county_id}</td>
                        <td className="table-td text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditRegion(r)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              title={`Edit ${r.name_en}`}
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteRegion(r.id, r.name_en)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title={`Delete ${r.name_en}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
            <h2 className="font-serif text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              {isNational ? <Flag size={16} className="text-emerald-700" /> : <MapPin size={16} className="text-[#c99335]" />}
              <span>{isNational ? 'Add County / Location' : t.regions_add}</span>
            </h2>

            {isNational ? (
              <form onSubmit={handleCounty(onCountySubmit)} className="space-y-3.5">
                <div>
                  <label className="label">County Name</label>
                  <input
                    {...regCounty('name')}
                    className="input-field"
                    placeholder="e.g. Nairobi County, Mombasa..."
                    dir="ltr"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Will be synced to the Quota Matrix and Candidate Filters.
                  </p>
                </div>
                <button type="submit" disabled={isSubCounty} className="btn-primary w-full mt-3 text-xs flex items-center justify-center gap-1.5">
                  <Plus size={14} /> Add County
                </button>
              </form>
            ) : (
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
                  <input type="number" {...regRegion('county_id')} className="input-field" placeholder="County code (e.g. 1)" dir="ltr" />
                </div>
                <button type="submit" disabled={isSubRegion} className="btn-primary w-full mt-3 text-xs flex items-center justify-center gap-1.5">
                  <Plus size={14} /> {tc.save}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: Create / Edit Competition Edition ───────────────────── */}
      <Modal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        title={isCreatingNewComp ? 'Create Competition Edition' : `Edit Edition — ${selectedComp?.title_en}`}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Host Organization Selector */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <label className="label !mb-2 flex items-center gap-1.5">
              <Building size={14} className="text-[#c99335]" />
              <span>HOST ORGANIZATION & ORGANIZER</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'JAMIA_MOSQUE', title: 'Jamia Mosque Committee', flag: '🕌' },
                { id: 'RELIGIOUS_ATTACHE', title: 'Saudi Religious Attaché', flag: '🇸🇦' },
                { id: 'JOINT_COLLABORATION', title: 'Joint Collaboration', flag: '🤝' },
                { id: 'CUSTOM', title: 'Custom Host Organization', flag: '🌐' },
              ].map(h => (
                <button
                  type="button"
                  key={h.id}
                  onClick={() => {
                    setCompHostOrg(h.id as HostOrganization)
                    if (h.id === 'JAMIA_MOSQUE') {
                      setCompHostNameEn('Jamia Mosque Committee · Nairobi')
                      setCompHostNameAr('لجنة مسجد جامعة نيروبي')
                    } else if (h.id === 'RELIGIOUS_ATTACHE') {
                      setCompHostNameEn('Saudi Religious Attaché · Embassy of Saudi Arabia')
                      setCompHostNameAr('الملحقية الدينية بسفارة خادم الحرمين الشريفين')
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    compHostOrg === h.id
                      ? 'border-[#006838] bg-emerald-50 text-emerald-950 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-sm">{h.flag}</span>
                  <span className="truncate">{h.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Titles & Edition Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Title (English) *</label>
              <input
                value={compTitleEn}
                onChange={e => setCompTitleEn(e.target.value)}
                className="input-field"
                placeholder="e.g. 14th Annual Jamia Quran Musabaqa (2026)"
              />
            </div>
            <div>
              <label className="label">Title (Arabic)</label>
              <input
                value={compTitleAr}
                onChange={e => setCompTitleAr(e.target.value)}
                className="input-field"
                placeholder="مسابقة حفظ وتلاوة القرآن الكريم"
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Edition Label</label>
              <input
                value={compEditionLabel}
                onChange={e => setCompEditionLabel(e.target.value)}
                className="input-field"
                placeholder="e.g. 14th Annual Edition (2026)"
              />
            </div>
            <div>
              <label className="label">Year</label>
              <input
                type="number"
                value={compYear}
                onChange={e => setCompYear(Number(e.target.value))}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={compStatus}
                onChange={e => setCompStatus(e.target.value as CompetitionStatus)}
                className="input-field cursor-pointer"
              >
                <option value="ACTIVE">🟢 Live & Active</option>
                <option value="CONCLUDED">🔵 Concluded & Archived</option>
                <option value="DRAFT">🟡 Draft & Setup</option>
              </select>
            </div>
          </div>

          {/* Scope & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Geographic Scope</label>
              <select
                value={compScope}
                onChange={e => setCompScope(e.target.value as any)}
                className="input-field cursor-pointer"
              >
                <option value="COUNTY_REGIONAL">County Level (Regional Zones)</option>
                <option value="NATIONAL">National Level (Kenya Counties)</option>
              </select>
            </div>
            <div>
              <label className="label">Venue Location (English)</label>
              <input
                value={compVenueEn}
                onChange={e => setCompVenueEn(e.target.value)}
                className="input-field"
                placeholder="e.g. Jamia Mosque Multi-Purpose Hall"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="label text-[10px]">Start Date</label>
              <input
                type="date"
                value={compStartDate}
                onChange={e => setCompStartDate(e.target.value)}
                className="input-field text-xs !px-2"
              />
            </div>
            <div>
              <label className="label text-[10px]">End Date</label>
              <input
                type="date"
                value={compEndDate}
                onChange={e => setCompEndDate(e.target.value)}
                className="input-field text-xs !px-2"
              />
            </div>
            <div>
              <label className="label text-[10px]">Reg Deadline</label>
              <input
                type="date"
                value={compRegDeadline}
                onChange={e => setCompRegDeadline(e.target.value)}
                className="input-field text-xs !px-2"
              />
            </div>
            <div>
              <label className="label text-[10px]">Grand Finale</label>
              <input
                type="date"
                value={compGrandFinale}
                onChange={e => setCompGrandFinale(e.target.value)}
                className="input-field text-xs !px-2"
              />
            </div>
          </div>

          {/* Branding & Media Images */}
          <div className="space-y-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <label className="label !mb-1 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-emerald-700" />
              <span>THEME POSTER & BANNER IMAGES</span>
            </label>

            <div>
              <label className="label text-[11px]">Theme Poster / Featured Image URL</label>
              <input
                value={compThemeImgUrl}
                onChange={e => setCompThemeImgUrl(e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="https://.../poster.jpg"
              />
            </div>

            <div>
              <label className="label text-[11px]">Wide Banner URL</label>
              <input
                value={compBannerUrl}
                onChange={e => setCompBannerUrl(e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="https://.../banner.jpg"
              />
            </div>

            {/* Live Preview */}
            {(compThemeImgUrl || compBannerUrl) && (
              <div className="relative h-24 w-full rounded-lg overflow-hidden border border-gray-300">
                <img
                  src={compBannerUrl || compThemeImgUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded font-bold">
                  Image Preview
                </span>
              </div>
            )}
          </div>

          {/* Descriptions */}
          <div>
            <label className="label">Description / About (English)</label>
            <textarea
              value={compDescEn}
              onChange={e => setCompDescEn(e.target.value)}
              rows={2}
              className="input-field text-xs"
              placeholder="Brief description about the Musabaqa edition..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
            <button onClick={() => setIsCompModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSaveCompetition} className="btn-primary flex items-center gap-1.5 font-bold">
              <Save size={14} /> {isCreatingNewComp ? 'Create Edition' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 2: Photo Gallery Manager ───────────────────────────────── */}
      <Modal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        title={`Media Gallery — ${selectedComp?.title_en}`}
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Add Photo Form */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <h4 className="font-serif font-bold text-xs text-gray-900 flex items-center gap-1.5">
              <Plus size={14} className="text-emerald-700" /> Add Photo / Image to Gallery
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-[11px]">Image URL *</label>
                <input
                  value={galleryPhotoUrl}
                  onChange={e => setGalleryPhotoUrl(e.target.value)}
                  className="input-field text-xs font-mono"
                  placeholder="https://.../photo.jpg"
                />
              </div>
              <div>
                <label className="label text-[11px]">Photo Title</label>
                <input
                  value={galleryPhotoTitle}
                  onChange={e => setGalleryPhotoTitle(e.target.value)}
                  className="input-field text-xs"
                  placeholder="e.g. Award Ceremony Presentation"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-[11px]">Event Stage Tag</label>
                <select
                  value={galleryPhotoStage}
                  onChange={e => setGalleryPhotoStage(e.target.value)}
                  className="input-field text-xs cursor-pointer"
                >
                  <option value="General">General Event</option>
                  <option value="Preliminary">Preliminary Rounds</option>
                  <option value="Semifinals">Semifinals</option>
                  <option value="Grand Finale">Grand Finale</option>
                  <option value="Award Ceremony">Award Ceremony & Prizes</option>
                </select>
              </div>
              <div>
                <label className="label text-[11px]">Caption / Description</label>
                <input
                  value={galleryPhotoCaption}
                  onChange={e => setGalleryPhotoCaption(e.target.value)}
                  className="input-field text-xs"
                  placeholder="e.g. Sheikh presenting trophy to winner"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddGalleryPhoto}
                className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1 font-bold"
              >
                <Plus size={13} /> Add Photo
              </button>
            </div>
          </div>

          {/* Gallery Photo Grid */}
          <div>
            <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider mb-3">
              Gallery Photos ({selectedComp?.gallery?.length || 0})
            </h4>

            {(!selectedComp?.gallery || selectedComp.gallery.length === 0) ? (
              <div className="py-8 text-center bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-xs">
                No photos in this competition gallery yet. Use the form above to add photos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedComp.gallery.map((item, idx) => (
                  <div key={item.id || idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                    <div className="relative h-32 w-full bg-gray-100">
                      <img
                        src={item.url}
                        alt={item.title || 'Photo'}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded backdrop-blur-xs">
                        {item.stage || 'General'}
                      </span>
                      <button
                        onClick={() => handleDeleteGalleryPhoto(item.id || '')}
                        className="absolute top-2 right-2 p-1.5 rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
                        title="Delete photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="p-2.5 text-xs flex-1">
                      <p className="font-bold text-gray-900 truncate">{item.title}</p>
                      {item.caption && <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">{item.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button onClick={() => setIsGalleryModalOpen(false)} className="btn-secondary">
              Close Gallery
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 3: Winners Podium & Hall of Fame ──────────────────────── */}
      <Modal
        isOpen={isPodiumModalOpen}
        onClose={() => setIsPodiumModalOpen(false)}
        title={`Winners Podium & Hall of Fame — ${selectedComp?.title_en}`}
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          <div className="bg-gradient-to-r from-amber-500/10 via-[#c99335]/15 to-amber-500/10 border border-amber-200 rounded-2xl p-4 text-center">
            <Trophy size={28} className="mx-auto text-[#c99335] mb-1.5" />
            <h3 className="font-serif font-bold text-sm text-amber-950">
              National Musabaqa Winners & Champions Hall of Fame
            </h3>
            <p className="text-xs text-amber-900/80 mt-0.5">
              Official ranked podium for 1st, 2nd, and 3rd place winners per judging category.
            </p>
          </div>

          {podiumData.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <Medal size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-600">No podium records recorded yet</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Podium winners will automatically appear once the final scoring rounds are concluded and finalized.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {podiumData.map((catPodium, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <h4 className="font-serif font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center justify-between">
                    <span>🏆 {catPodium.category_name_en || `Category #${catPodium.category_id}`}</span>
                    <span className="text-xs text-amber-800 font-medium">Final Round Top 3</span>
                  </h4>

                  {/* 3-Tier Visual Podium Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* 🥇 1st Place */}
                    <div className="p-3 rounded-xl bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400/80 shadow-xs flex flex-col items-center text-center">
                      <div className="w-9 h-9 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center shadow-xs mb-2">
                        🥇 1
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">1st Place Champion</span>
                      <p className="font-bold text-xs text-gray-900 mt-1">
                        {catPodium.rank_1?.student_name || 'TBD'}
                      </p>
                      <p className="text-[11px] text-gray-500">{catPodium.rank_1?.institution_name || '—'}</p>
                      {catPodium.rank_1?.score && (
                        <span className="mt-2 text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {catPodium.rank_1.score}% Score
                        </span>
                      )}
                      {catPodium.rank_1?.award_notes && (
                        <p className="text-[10px] text-amber-900/80 mt-1 italic">{catPodium.rank_1.award_notes}</p>
                      )}
                    </div>

                    {/* 🥈 2nd Place */}
                    <div className="p-3 rounded-xl bg-gradient-to-b from-slate-50 to-white border-2 border-slate-300 shadow-xs flex flex-col items-center text-center">
                      <div className="w-9 h-9 rounded-full bg-slate-300 text-slate-800 font-black text-sm flex items-center justify-center shadow-xs mb-2">
                        🥈 2
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">2nd Place Runner-Up</span>
                      <p className="font-bold text-xs text-gray-900 mt-1">
                        {catPodium.rank_2?.student_name || 'TBD'}
                      </p>
                      <p className="text-[11px] text-gray-500">{catPodium.rank_2?.institution_name || '—'}</p>
                      {catPodium.rank_2?.score && (
                        <span className="mt-2 text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {catPodium.rank_2.score}% Score
                        </span>
                      )}
                      {catPodium.rank_2?.award_notes && (
                        <p className="text-[10px] text-slate-700 mt-1 italic">{catPodium.rank_2.award_notes}</p>
                      )}
                    </div>

                    {/* 🥉 3rd Place */}
                    <div className="p-3 rounded-xl bg-gradient-to-b from-amber-900/5 to-white border-2 border-amber-700/30 shadow-xs flex flex-col items-center text-center">
                      <div className="w-9 h-9 rounded-full bg-amber-700/30 text-amber-950 font-black text-sm flex items-center justify-center shadow-xs mb-2">
                        🥉 3
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">3rd Place</span>
                      <p className="font-bold text-xs text-gray-900 mt-1">
                        {catPodium.rank_3?.student_name || 'TBD'}
                      </p>
                      <p className="text-[11px] text-gray-500">{catPodium.rank_3?.institution_name || '—'}</p>
                      {catPodium.rank_3?.score && (
                        <span className="mt-2 text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900">
                          {catPodium.rank_3.score}% Score
                        </span>
                      )}
                      {catPodium.rank_3?.award_notes && (
                        <p className="text-[10px] text-amber-900/80 mt-1 italic">{catPodium.rank_3.award_notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button onClick={() => setIsPodiumModalOpen(false)} className="btn-secondary">
              Close Podium
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 4: Replicate to Jamia Admin Events ──────────────────────── */}
      <Modal
        isOpen={isReplicationModalOpen}
        onClose={() => setIsReplicationModalOpen(false)}
        title={`Replicate Event — ${selectedComp?.title_en}`}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-2">
            <h4 className="font-serif font-bold text-xs text-indigo-950 flex items-center gap-1.5">
              <Share2 size={15} className="text-indigo-600" /> Jamia Events Replication Engine
            </h4>
            <p className="text-xs text-indigo-900/80">
              This formatted event payload includes the competition title, venue, dates, theme banner, and rich HTML description with winners & podium details, ready for sync with Jamia Mosque Committee Events.
            </p>
          </div>

          {isReplicating ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              <RefreshCw size={20} className="animate-spin mx-auto text-indigo-600 mb-2" />
              Generating event replication payload...
            </div>
          ) : replicationPayload ? (
            <div className="space-y-3">
              {/* Event Card Preview */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Event Preview
                </span>
                <h3 className="font-bold text-sm text-gray-900">{replicationPayload.title}</h3>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-700" /> {replicationPayload.location}
                </p>
                {replicationPayload.image_url && (
                  <img
                    src={replicationPayload.image_url}
                    alt="Event"
                    className="w-full h-28 object-cover rounded-lg border border-gray-200 mt-2"
                  />
                )}
              </div>

              {/* Rich HTML preview box */}
              <div>
                <label className="label text-[11px]">Formatted Event HTML Description</label>
                <div
                  className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 max-h-36 overflow-y-auto font-mono text-[11px]"
                >
                  {replicationPayload.description_html}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCopyReplicationPayload}
                  className="btn-primary flex items-center gap-1.5 font-bold text-xs"
                >
                  <Copy size={13} /> Copy Ready Payload JSON
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Failed to load payload</p>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button onClick={() => setIsReplicationModalOpen(false)} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </Modal>

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

      {/* Edit Region Modal */}
      <Modal isOpen={!!editingRegion} onClose={() => setEditingRegion(null)} title={`Edit Region — ${editingRegion?.name_en}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Name (English)</label>
            <input value={editRegionNameEn} onChange={e => setEditRegionNameEn(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Name (Arabic)</label>
            <input value={editRegionNameAr} onChange={e => setEditRegionNameAr(e.target.value)} className="input-field" dir="rtl" />
          </div>
          <div>
            <label className="label">County ID</label>
            <input type="number" value={editRegionCountyId} onChange={e => setEditRegionCountyId(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setEditingRegion(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveEditRegion} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Edit County Modal */}
      <Modal isOpen={!!editingCounty} onClose={() => setEditingCounty(null)} title={`Edit County — ${editingCounty?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="label">County / Location Name</label>
            <input value={editCountyName} onChange={e => setEditCountyName(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setEditingCounty(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveEditCounty} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
