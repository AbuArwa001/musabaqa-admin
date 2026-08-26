'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Dict } from '@/lib/dictionaries'
import type { AdminRole } from '@/lib/auth'
import {
  LayoutDashboard, Building2, Users, Archive,
  Trophy, Radio, Settings, FileBarChart, ScrollText, LogOut
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: AdminRole[]
}

function getNavItems(locale: string, dict: Dict): NavItem[] {
  return [
    { href: `/${locale}/dashboard`, label: dict.nav.dashboard, icon: <LayoutDashboard size={18} />, roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'] },
    { href: `/${locale}/dashboard/institutions`, label: dict.nav.institutions, icon: <Building2 size={18} />, roles: ['SUPERADMIN', 'MODERATOR'] },
    { href: `/${locale}/dashboard/students`, label: dict.nav.students, icon: <Users size={18} />, roles: ['SUPERADMIN', 'MODERATOR'] },
    { href: `/${locale}/dashboard/archive`, label: dict.nav.archive, icon: <Archive size={18} />, roles: ['SUPERADMIN', 'MODERATOR'] },
    { href: `/${locale}/dashboard/rounds`, label: dict.nav.rounds, icon: <Trophy size={18} />, roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'] },
    { href: `/${locale}/dashboard/live`, label: dict.nav.live, icon: <Radio size={18} />, roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'] },
    { href: `/${locale}/dashboard/settings`, label: dict.nav.settings, icon: <Settings size={18} />, roles: ['SUPERADMIN'] },
    { href: `/${locale}/dashboard/reports`, label: dict.nav.reports, icon: <FileBarChart size={18} />, roles: ['SUPERADMIN', 'MODERATOR'] },
    { href: `/${locale}/dashboard/audit`, label: dict.nav.audit, icon: <ScrollText size={18} />, roles: ['SUPERADMIN'] },
  ]
}

interface SidebarProps {
  locale: string
  dict: Dict
  role: AdminRole
  userName: string
}

export default function Sidebar({ locale, dict, role, userName }: SidebarProps) {
  const pathname = usePathname()
  const items = getNavItems(locale, dict).filter(item => item.roles.includes(role))
  const isAr = locale === 'ar'

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = `/${locale}/login`
  }

  return (
    <aside className={`fixed top-0 ${isAr ? 'right-0' : 'left-0'} h-full w-60 z-40 flex flex-col
      bg-[#0f0f11] border-${isAr ? 'l' : 'r'} border-white/5`}>

      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600/30 to-amber-800/20 border border-amber-500/30 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(201,147,53,0.2)]">
            🕌
          </div>
          <div>
            <p className="text-amber-400 font-bold text-sm leading-tight">Musabaqa</p>
            <p className="text-stone-500 text-xs">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="glass-sm px-3 py-2.5">
          <p className="text-white text-sm font-medium truncate">{userName}</p>
          <p className="text-amber-400/80 text-xs">{role}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const active = pathname.startsWith(item.href) &&
            (item.href !== `/${locale}/dashboard` || pathname === `/${locale}/dashboard`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                isAr ? 'flex-row-reverse' : '',
                active
                  ? 'bg-gradient-to-r from-amber-600/15 to-amber-800/10 border border-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(201,147,53,0.1)]'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              )}
            >
              <span className={active ? 'text-amber-400' : 'text-stone-500'}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all w-full ${isAr ? 'flex-row-reverse' : ''}`}
        >
          <LogOut size={18} />
          <span>{dict.nav.logout}</span>
        </button>
      </div>
    </aside>
  )
}
