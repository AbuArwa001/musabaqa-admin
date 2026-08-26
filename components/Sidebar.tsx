'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { Dict } from '@/lib/dictionaries'
import type { AdminRole } from '@/lib/auth'
import {
  LayoutDashboard, 
  Building2, 
  Users, 
  Archive,
  Trophy, 
  Radio, 
  Settings, 
  FileBarChart, 
  ScrollText, 
  LogOut
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: AdminRole[]
  group: string
}

function getNavItems(locale: string, dict: Dict): NavItem[] {
  return [
    { href: `/${locale}/dashboard`,              label: dict.nav.dashboard,    icon: <LayoutDashboard className="w-4 h-4 text-[#c99335]" />, roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'], group: 'Main Overview' },
    { href: `/${locale}/dashboard/live`,         label: dict.nav.live,         icon: <Radio className="w-4 h-4 text-emerald-400" />,           roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'], group: 'Main Overview' },
    { href: `/${locale}/dashboard/institutions`, label: dict.nav.institutions, icon: <Building2 className="w-4 h-4 text-sky-400" />,          roles: ['SUPERADMIN', 'MODERATOR'],          group: 'Management' },
    { href: `/${locale}/dashboard/students`,     label: dict.nav.students,     icon: <Users className="w-4 h-4 text-amber-400" />,             roles: ['SUPERADMIN', 'MODERATOR'],          group: 'Management' },
    { href: `/${locale}/dashboard/rounds`,       label: dict.nav.rounds,       icon: <Trophy className="w-4 h-4 text-purple-400" />,          roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'], group: 'Management' },
    { href: `/${locale}/dashboard/archive`,      label: dict.nav.archive,      icon: <Archive className="w-4 h-4 text-rose-400" />,           roles: ['SUPERADMIN', 'MODERATOR'],          group: 'Management' },
    { href: `/${locale}/dashboard/reports`,      label: dict.nav.reports,      icon: <FileBarChart className="w-4 h-4 text-teal-400" />,       roles: ['SUPERADMIN', 'MODERATOR'],          group: 'System Administration' },
    { href: `/${locale}/dashboard/audit`,        label: dict.nav.audit,        icon: <ScrollText className="w-4 h-4 text-amber-400" />,         roles: ['SUPERADMIN'],                       group: 'System Administration' },
    { href: `/${locale}/dashboard/settings`,     label: dict.nav.settings,     icon: <Settings className="w-4 h-4 text-[#c99335]" />,          roles: ['SUPERADMIN'],                       group: 'System Administration' },
  ]
}

const getRoleBadgeColor = (userRole: AdminRole) => {
  switch (userRole) {
    case 'SUPERADMIN':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    case 'JUDGE':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    case 'MODERATOR':
    default:
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  }
}

interface SidebarProps {
  locale: string
  dict: Dict
  role: AdminRole
  userName: string
}

export default function Sidebar({ locale, dict, role, userName }: SidebarProps) {
  const pathname = usePathname()
  const allItems = getNavItems(locale, dict)
  const items = allItems.filter(item => item.roles.includes(role))
  const isAr = locale === 'ar'

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = `/${locale}/login`
  }

  const groups = ['Main Overview', 'Management', 'System Administration']
  const grouped = groups.reduce<Record<string, NavItem[]>>((acc, g) => {
    acc[g] = items.filter(i => i.group === g)
    return acc
  }, {})

  return (
    <aside
      className={`w-64 bg-[#1a1512] text-white flex flex-col h-full flex-shrink-0 border-r border-[#2d2520] shadow-xl ${
        isAr ? 'border-r-0 border-l' : ''
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#2d2520] bg-[#120e0c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a1512] to-[#0a0807] border border-[#c99335]/40 flex items-center justify-center p-1.5 shadow-md shrink-0">
            <Image
              src="/logo.png"
              alt="Jamia Mosque Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-base font-bold tracking-tight text-white leading-tight truncate">
              Jamia Mosque
            </h1>
            <p className="text-[10px] text-[#c99335] font-semibold tracking-wider uppercase">
              Musabaqa Admin CMS
            </p>
          </div>
        </div>

        {/* User Role Pill */}
        <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-white/10">
          <span className="text-[11px] text-gray-400 truncate max-w-[110px]" title={userName}>
            {userName || 'Staff User'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadgeColor(role)}`}>
            {role}
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {groups.map(groupName => {
          const groupItems = grouped[groupName]
          if (!groupItems?.length) return null
          return (
            <div key={groupName}>
              <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                {groupName}
              </span>
              <ul className="space-y-1">
                {groupItems.map(item => {
                  const isExact = item.href === `/${locale}/dashboard`
                  const active = isExact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          active
                            ? 'bg-white/10 text-white font-semibold shadow-sm'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Footer Logout */}
      <div className="p-4 border-t border-[#2d2520] bg-[#120e0c]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/60 rounded-md transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{dict.nav.logout}</span>
        </button>
      </div>
    </aside>
  )
}
