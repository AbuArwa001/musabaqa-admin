'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  createAdminUser, createRegion,
  type Region, type Category, type AdminUserRead
} from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { UserPlus, MapPin, List, Settings } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

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

export default function SettingsClient({ 
  regions: initialRegions, categories: initialCategories, users: initialUsers, dict, locale, token 
}: { 
  regions: Region[], categories: Category[], users: AdminUserRead[], dict: Dict, locale: string, token: string 
}) {
  const t = dict.settings
  const tc = dict.common

  const [activeTab, setActiveTab] = useState<'users' | 'regions' | 'categories'>('users')
  const [users, setUsers] = useState(initialUsers)
  const [regions, setRegions] = useState(initialRegions)
  
  const { register: regUser, handleSubmit: handleUser, reset: resetUser, watch: watchUser, formState: { isSubmitting: isSubUser } } = useForm<z.infer<typeof userSchema>>({ resolver: zodResolver(userSchema) })
  const { register: regRegion, handleSubmit: handleRegion, reset: resetRegion, formState: { isSubmitting: isSubRegion } } = useForm<z.infer<typeof regionSchema>>({ resolver: zodResolver(regionSchema) })

  const userRole = watchUser('role')

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

  return (
    <div className="space-y-6">
      <PageHeader title={t.title} subtitle="Manage admin accounts, competition regions, and judging categories" />
      
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border ${
            activeTab === 'users'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <Settings size={14} /> {t.tab_users}
        </button>
        <button
          onClick={() => setActiveTab('regions')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border ${
            activeTab === 'regions'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <MapPin size={14} /> {t.tab_regions}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border ${
            activeTab === 'categories'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <List size={14} /> {t.tab_categories}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
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
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200">{u.role}</span>
                        {u.judge_role && <span className="ml-1.5 text-xs text-amber-700 font-medium">({u.judge_role})</span>}
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
                <div><label className="label">{t.user_name}</label><input {...regUser('name')} className="input-field" placeholder="Full name" /></div>
                <div><label className="label">{t.user_email}</label><input {...regUser('email')} type="email" className="input-field" placeholder="user@jmc.or.ke" dir="ltr" /></div>
                <div><label className="label">{t.user_password}</label><input {...regUser('password')} type="password" className="input-field" placeholder="••••••••" dir="ltr" /></div>
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
          </>
        )}

        {/* Regions Tab */}
        {activeTab === 'regions' && (
          <>
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
                      <td className="table-td text-gray-500">{r.county_id}</td>
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
                <div><label className="label">{t.region_name_en}</label><input {...regRegion('name_en')} className="input-field" placeholder="e.g. Coast Region" dir="ltr" /></div>
                <div><label className="label">{t.region_name_ar}</label><input {...regRegion('name_ar')} className="input-field" placeholder="المنطقة الساحلية" dir="rtl" /></div>
                <div><label className="label">{t.region_county}</label><input type="number" {...regRegion('county_id')} className="input-field" placeholder="County code" dir="ltr" /></div>
                <button type="submit" disabled={isSubRegion} className="btn-primary w-full mt-3 text-xs">{tc.save}</button>
              </form>
            </div>
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">Group</th>
                  <th className="table-th">{t.category_name_en}</th>
                  <th className="table-th">{t.category_name_ar}</th>
                  <th className="table-th">Age Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialCategories.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-td text-gray-500 font-mono text-xs">#{c.id}</td>
                    <td className="table-td font-bold text-amber-700 text-xs uppercase">{c.category_group}</td>
                    <td className="table-td font-semibold text-gray-900">{c.name_en}</td>
                    <td className="table-td font-semibold text-gray-900">{c.name_ar}</td>
                    <td className="table-td text-gray-600 text-xs font-medium">{c.min_age || 0} – {c.max_age || '∞'} yrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
