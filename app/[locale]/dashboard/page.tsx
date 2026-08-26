import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { listInstitutions, listStudents, listRounds } from '@/lib/api'
import { TrendingUp, Users, Trophy, Bell } from 'lucide-react'

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
    {
      label: t.kpi_pending_institutions, value: institutions.length,
      icon: <TrendingUp size={22} />, color: 'amber',
      glow: 'shadow-[0_0_20px_rgba(201,147,53,0.15)]',
      border: 'border-amber-500/20', iconBg: 'bg-amber-500/10 text-amber-400',
    },
    {
      label: t.kpi_pending_students, value: students.length,
      icon: <Users size={22} />, color: 'blue',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      border: 'border-blue-500/20', iconBg: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: t.kpi_active_rounds, value: rounds.length,
      icon: <Trophy size={22} />, color: 'emerald',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      label: t.kpi_upcoming, value: 0,
      icon: <Bell size={22} />, color: 'purple',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      border: 'border-purple-500/20', iconBg: 'bg-purple-500/10 text-purple-400',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400">{t.title}</h1>
      <p className="text-stone-500 text-sm mb-10">Musabaqa Competition Management System</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`kpi-card ${kpi.glow} ${kpi.border}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
              {kpi.icon}
            </div>
            <p className="text-4xl font-bold text-white mt-2">{kpi.value}</p>
            <p className="text-stone-400 text-sm">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Quick-action panels */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending institutions */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">⏳ {dict.institutions.filter_pending} {dict.nav.institutions}</h2>
          {institutions.slice(0, 5).length === 0
            ? <p className="text-stone-500 text-sm">None pending</p>
            : (
              <div className="space-y-2">
                {institutions.slice(0, 5).map(i => (
                  <div key={i.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-stone-200">{i.name}</span>
                    <span className="badge-pending">{dict.common.status_pending}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Active rounds */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🏆 {dict.rounds.status_active} {dict.nav.rounds}</h2>
          {rounds.length === 0
            ? <p className="text-stone-500 text-sm">No active rounds</p>
            : (
              <div className="space-y-2">
                {rounds.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-stone-200">Round #{r.id} — {r.round_type}</span>
                    <span className="badge-approved">{dict.rounds.status_active}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
