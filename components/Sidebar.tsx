'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Dict } from '@/lib/dictionaries'
import type { AdminRole } from '@/lib/auth'
import {
  LayoutDashboard, Building2, Users, Archive,
  Trophy, Radio, Settings, FileBarChart, ScrollText, LogOut, ChevronRight
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
    { href: `/${locale}/dashboard`,              label: dict.nav.dashboard,    icon: <LayoutDashboard size={17} />, roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'], group: 'Overview' },
    { href: `/${locale}/dashboard/live`,         label: dict.nav.live,         icon: <Radio size={17} />,           roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'], group: 'Overview' },
    { href: `/${locale}/dashboard/institutions`, label: dict.nav.institutions, icon: <Building2 size={17} />,       roles: ['SUPERADMIN', 'MODERATOR'],          group: 'Management' },
    { href: `/${locale}/dashboard/students`,     label: dict.nav.students,     icon: <Users size={17} />,           roles: ['SUPERADMIN', 'MODERATOR'],          group: 'Management' },
    { href: `/${locale}/dashboard/rounds`,       label: dict.nav.rounds,       icon: <Trophy size={17} />,          roles: ['SUPERADMIN', 'JUDGE', 'MODERATOR'], group: 'Management' },
    { href: `/${locale}/dashboard/archive`,      label: dict.nav.archive,      icon: <Archive size={17} />,         roles: ['SUPERADMIN', 'MODERATOR'],          group: 'Management' },
    { href: `/${locale}/dashboard/reports`,      label: dict.nav.reports,      icon: <FileBarChart size={17} />,    roles: ['SUPERADMIN', 'MODERATOR'],          group: 'System' },
    { href: `/${locale}/dashboard/audit`,        label: dict.nav.audit,        icon: <ScrollText size={17} />,      roles: ['SUPERADMIN'],                       group: 'System' },
    { href: `/${locale}/dashboard/settings`,     label: dict.nav.settings,     icon: <Settings size={17} />,        roles: ['SUPERADMIN'],                       group: 'System' },
  ]
}

const roleColors: Record<AdminRole, { bg: string; text: string; border: string }> = {
  SUPERADMIN: { bg: 'rgba(240,192,96,0.12)',  text: '#f0c060', border: 'rgba(240,192,96,0.25)' },
  JUDGE:      { bg: 'rgba(91,141,245,0.12)',  text: '#5b8df5', border: 'rgba(91,141,245,0.25)' },
  MODERATOR:  { bg: 'rgba(0,216,138,0.12)',   text: '#00d88a', border: 'rgba(0,216,138,0.25)' },
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
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

  const rc = roleColors[role]

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = `/${locale}/login`
  }

  // Group items
  const groups = ['Overview', 'Management', 'System']
  const grouped = groups.reduce<Record<string, NavItem[]>>((acc, g) => {
    acc[g] = items.filter(i => i.group === g)
    return acc
  }, {})

  return (
    <aside
      className={`fixed top-0 ${isAr ? 'right-0' : 'left-0'} h-full w-72 z-40 flex flex-col`}
      style={{
        background: 'linear-gradient(180deg, #0d0d1c 0%, #09090f 100%)',
        borderRight: isAr ? 'none' : '1px solid rgba(255,255,255,0.06)',
        borderLeft:  isAr ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
    >
      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(240,192,96,0.4), transparent)' }}
      />

      {/* ── Logo ── */}
      <div className="px-6 py-7">
        <div className={`flex items-center gap-3.5 ${isAr ? 'flex-row-reverse' : ''}`}>
          {/* Logo mark */}
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="Musabaqa Logo" width={48} height={48} className="object-contain" priority />
          </div>
          <div className={isAr ? 'text-right' : ''}>
            <p
              className="font-bold text-base leading-none"
              style={{
                background: 'linear-gradient(135deg, #f0c060 0%, #fde68a 60%, #e8a83a 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--font-display)',
              }}
            >
              Musabaqa
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(160,160,192,0.5)', fontFamily: 'var(--font-display)' }}>
              Admin Portal
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="divider mx-4" />

      {/* ── User Card ── */}
      <div className="px-4 py-4">
        <div
          className={`flex items-center gap-3 px-3 py-3 rounded-2xl ${isAr ? 'flex-row-reverse' : ''}`}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${rc.bg.replace('0.12)', '0.3)')} 0%, ${rc.bg.replace('0.12)', '0.15)')} 100%)`,
              border: `1px solid ${rc.border}`,
              color: rc.text,
              fontFamily: 'var(--font-display)',
            }}
          >
            {getInitials(userName)}
          </div>
          <div className={`flex-1 min-w-0 ${isAr ? 'text-right' : ''}`}>
            <p className="text-sm font-semibold truncate" style={{ color: '#f0f0ff', fontFamily: 'var(--font-display)' }}>
              {userName}
            </p>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, fontFamily: 'var(--font-display)' }}
            >
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-5">
        {groups.map(groupName => {
          const groupItems = grouped[groupName]
          if (!groupItems?.length) return null
          return (
            <div key={groupName}>
              <p className="section-label mb-2">{groupName}</p>
              <div className="space-y-0.5">
                {groupItems.map(item => {
                  const isExact = item.href === `/${locale}/dashboard`
                  const active = isExact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isAr ? 'flex-row-reverse' : '',
                        active ? 'active-nav-item' : 'inactive-nav-item'
                      )}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(240,192,96,0.12) 0%, rgba(240,192,96,0.06) 100%)',
                        border: '1px solid rgba(240,192,96,0.2)',
                        color: '#f0c060',
                        boxShadow: '0 0 20px rgba(240,192,96,0.08)',
                      } : {
                        border: '1px solid transparent',
                        color: 'rgba(160,160,192,0.7)',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                          ;(e.currentTarget as HTMLElement).style.color = '#f0f0ff'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent'
                          ;(e.currentTarget as HTMLElement).style.color = 'rgba(160,160,192,0.7)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
                        }
                      }}
                    >
                      <span style={{ color: active ? '#f0c060' : 'rgba(160,160,192,0.5)' }}>
                        {item.icon}
                      </span>
                      <span className="flex-1" style={{ fontFamily: 'var(--font-display)', fontSize: '0.8375rem' }}>
                        {item.label}
                      </span>
                      {active && (
                        <ChevronRight size={13} style={{ color: 'rgba(240,192,96,0.5)' }} />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="px-3 py-4">
        <div className="divider mb-4" />
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${isAr ? 'flex-row-reverse' : ''}`}
          style={{
            color: 'rgba(245,107,126,0.7)',
            border: '1px solid transparent',
            fontFamily: 'var(--font-display)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(245,107,126,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = '#f56b7e'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,107,126,0.15)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(245,107,126,0.7)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
          }}
        >
          <LogOut size={17} />
          <span className="font-medium">{dict.nav.logout}</span>
        </button>
      </div>
    </aside>
  )
}
