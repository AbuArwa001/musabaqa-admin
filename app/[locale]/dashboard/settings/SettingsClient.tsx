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
  county_id: z.string().min(1), // usually a number, keep string for form
})

export default function SettingsClient({ 
  regions: initialRegions, categories: initialCategories, users: initialUsers, dict, locale, token 
}: { 
  regions: Region[], categories: Category[], users: AdminUserRead[], dict: Dict, locale: string, token: string 
}) {
  const t = dict.settings
  const tc = dict.common
  const isAr = locale === 'ar'

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
    <div>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400 mb-8">{t.title}</h1>
      
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-stone-400 hover:text-white'}`}>
          <Settings size={16} /> {t.tab_users}
        </button>
        <button onClick={() => setActiveTab('regions')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'regions' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-stone-400 hover:text-white'}`}>
          <MapPin size={16} /> {t.tab_regions}
        </button>
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'categories' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-stone-400 hover:text-white'}`}>
          <List size={16} /> {t.tab_categories}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="lg:col-span-2 glass overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/10 bg-black/20">
                  <tr>
                    <th className="table-th">{t.user_name}</th>
                    <th className="table-th">{t.user_email}</th>
                    <th className="table-th">{t.user_role}</th>
                    <th className="table-th">{tc.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="table-row-hover border-b border-white/5 last:border-0">
                      <td className="table-td font-medium text-white">{u.name}</td>
                      <td className="table-td text-stone-400">{u.email}</td>
                      <td className="table-td">
                        <span className="text-xs px-2 py-1 rounded bg-white/10 text-stone-300">{u.role}</span>
                        {u.judge_role && <span className="ml-2 text-xs text-amber-400">{u.judge_role}</span>}
                      </td>
                      <td className="table-td"><button className="text-stone-500 hover:text-white">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="lg:col-span-1 glass p-6 h-fit">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <UserPlus size={18} className="text-amber-400" /> {t.user_create}
              </h2>
              <form onSubmit={handleUser(onUserSubmit)} className="space-y-4">
                <div><label className="label">{t.user_name}</label><input {...regUser('name')} className="input-field" /></div>
                <div><label className="label">{t.user_email}</label><input {...regUser('email')} type="email" className="input-field" dir="ltr" /></div>
                <div><label className="label">{t.user_password}</label><input {...regUser('password')} type="password" className="input-field" dir="ltr" /></div>
                <div>
                  <label className="label">{t.user_role}</label>
                  <select {...regUser('role')} className="input-field">
                    <option value="SUPERADMIN">Super Admin</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="JUDGE">Judge</option>
                  </select>
                </div>
                {userRole === 'JUDGE' && (
                  <div>
                    <label className="label">{t.user_judge_role}</label>
                    <select {...regUser('judge_role')} className="input-field">
                      <option value="REGULAR">Regular</option>
                      <option value="GUEST_NEUTRAL">Guest Neutral</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">{t.user_language}</label>
                  <select {...regUser('preferred_language')} className="input-field">
                    <option value="EN">English</option>
                    <option value="AR">Arabic</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubUser} className="btn-primary w-full mt-4">{t.user_create}</button>
              </form>
            </div>
          </>
        )}

        {/* Regions Tab */}
        {activeTab === 'regions' && (
          <>
            <div className="lg:col-span-2 glass overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/10 bg-black/20">
                  <tr>
                    <th className="table-th">ID</th>
                    <th className="table-th">{t.region_name_en}</th>
                    <th className="table-th">{t.region_name_ar}</th>
                    <th className="table-th">County ID</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map(r => (
                    <tr key={r.id} className="table-row-hover border-b border-white/5 last:border-0">
                      <td className="table-td text-stone-400">#{r.id}</td>
                      <td className="table-td text-white">{r.name_en}</td>
                      <td className="table-td text-white">{r.name_ar}</td>
                      <td className="table-td text-stone-400">{r.county_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-1 glass p-6 h-fit">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <MapPin size={18} className="text-amber-400" /> {t.regions_add}
              </h2>
              <form onSubmit={handleRegion(onRegionSubmit)} className="space-y-4">
                <div><label className="label">{t.region_name_en}</label><input {...regRegion('name_en')} className="input-field" dir="ltr" /></div>
                <div><label className="label">{t.region_name_ar}</label><input {...regRegion('name_ar')} className="input-field" dir="rtl" /></div>
                <div><label className="label">{t.region_county}</label><input type="number" {...regRegion('county_id')} className="input-field" dir="ltr" /></div>
                <button type="submit" disabled={isSubRegion} className="btn-primary w-full mt-4">{tc.save}</button>
              </form>
            </div>
          </>
        )}

        {/* Categories Tab (Read-only list for demo) */}
        {activeTab === 'categories' && (
          <div className="lg:col-span-3 glass overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-white/10 bg-black/20">
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">Group</th>
                  <th className="table-th">{t.category_name_en}</th>
                  <th className="table-th">{t.category_name_ar}</th>
                  <th className="table-th">Age Range</th>
                </tr>
              </thead>
              <tbody>
                {initialCategories.map(c => (
                  <tr key={c.id} className="table-row-hover border-b border-white/5 last:border-0">
                    <td className="table-td text-stone-400">#{c.id}</td>
                    <td className="table-td text-amber-400 text-xs font-medium uppercase">{c.category_group}</td>
                    <td className="table-td text-white">{c.name_en}</td>
                    <td className="table-td text-white">{c.name_ar}</td>
                    <td className="table-td text-stone-400">{c.min_age || 0} - {c.max_age || '∞'}</td>
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
