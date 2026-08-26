import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listInstitutions, listStudents, listRounds } from '@/lib/api'
import { TrendingUp, Users, Trophy, Bell, ArrowRight, Clock, Building2 } from 'lucide-react'
import Link from 'next/link'
import StatCard from '@/components/StatCard'
import PageHeader from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const dict = await getDictionary(locale)
  const t = dict.dashboard

  const [institutions, students, rounds] = await Promise.all([
    listInstitutions(token, 'PENDING').catch(() => []),
    listStudents(token, { review_status: 'PENDING_REVIEW' }).catch(() => []),
    listRounds(token, { status: 'ACTIVE' }).catch(() => []),
  ])

  const kpis = [
    { label: t.kpi_pending_institutions, value: institutions.length, icon: <TrendingUp size={20} />, color: 'gold'     as const, animDelay: 0 },
    { label: t.kpi_pending_students,     value: students.length,     icon: <Users size={20} />,     color: 'sapphire' as const, animDelay: 100 },
    { label: t.kpi_active_rounds,        value: rounds.length,       icon: <Trophy size={20} />,    color: 'emerald'  as const, animDelay: 200 },
    { label: t.kpi_upcoming,             value: 0,                   icon: <Bell size={20} />,      color: 'purple'   as const, animDelay: 300 },
  ]

  return (
    <div className="animate-fade-slide-up">
      <PageHeader
        title={t.title}
        subtitle="Musabaqa Quran Competition Management System"
        badge={{ label: 'Live', color: 'emerald' }}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {kpis.map(kpi => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Quick-action panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending Institutions */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,192,96,0.12)', border: '1px solid rgba(240,192,96,0.2)' }}>
                <Building2 size={15} style={{ color: '#f0c060' }} />
              </div>
              <h2 className="font-semibold text-base" style={{ color: '#f0f0ff', fontFamily: 'var(--font-display)' }}>
                {dict.institutions.filter_pending} {dict.nav.institutions}
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/institutions`}
              className="flex items-center gap-1 text-xs font-semibold transition-all duration-200 text-[#f0c060]/70 hover:text-[#f0c060]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="px-6 py-4">
            {institutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,216,138,0.08)', border: '1px solid rgba(0,216,138,0.15)' }}>
                  <span style={{ fontSize: '1.1rem' }}>✓</span>
                </div>
                <p className="text-sm" style={{ color: 'rgba(160,160,192,0.6)' }}>All clear — no pending institutions</p>
              </div>
            ) : (
              <div className="space-y-1">
                {institutions.slice(0, 5).map(i => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-150 hover:bg-white/[0.03]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#f0c060', boxShadow: '0 0 6px #f0c060' }} />
                      <span className="text-sm font-medium" style={{ color: '#e0e0f5', fontFamily: 'var(--font-display)' }}>{i.name}</span>
                    </div>
                    <span className="badge-pending">{dict.common.status_pending}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Rounds */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}
        >
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,216,138,0.12)', border: '1px solid rgba(0,216,138,0.2)' }}>
                <Trophy size={15} style={{ color: '#00d88a' }} />
              </div>
              <h2 className="font-semibold text-base" style={{ color: '#f0f0ff', fontFamily: 'var(--font-display)' }}>
                {dict.rounds.status_active} {dict.nav.rounds}
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/rounds`}
              className="flex items-center gap-1 text-xs font-semibold transition-all duration-200 text-[#00d88a]/70 hover:text-[#00d88a]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="px-6 py-4">
            {rounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  <Clock size={18} style={{ color: '#a78bfa' }} />
                </div>
                <p className="text-sm" style={{ color: 'rgba(160,160,192,0.6)' }}>No active rounds at the moment</p>
              </div>
            ) : (
              <div className="space-y-1">
                {rounds.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-150 hover:bg-white/[0.03]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#00d88a', boxShadow: '0 0 6px #00d88a' }} />
                      <span className="text-sm font-medium" style={{ color: '#e0e0f5', fontFamily: 'var(--font-display)' }}>
                        Round #{r.id} — {r.round_type}
                      </span>
                    </div>
                    <span className="badge-approved">{dict.rounds.status_active}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
