import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { isValidLocale, getDictionary } from '@/lib/dictionaries'
import { decodeAdminToken } from '@/lib/auth'
import { listInstitutions, listStudents, listRounds } from '@/lib/api'
import { 
  Building2, 
  Users, 
  Trophy, 
  Bell, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Radio,
  FileBarChart,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import StatCard from '@/components/StatCard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const store = await cookies()
  const token = store.get('musabaqa_admin_token')!.value
  const claims = decodeAdminToken(token)
  const role = claims?.role || 'SUPERADMIN'
  const dict = await getDictionary(locale)
  const t = dict.dashboard

  const [institutions, students, rounds] = await Promise.all([
    listInstitutions(token, 'PENDING').catch(() => []),
    listStudents(token, { review_status: 'PENDING_REVIEW' }).catch(() => []),
    listRounds(token, { status: 'ACTIVE' }).catch(() => []),
  ])

  const stats = [
    { 
      label: t.kpi_pending_institutions, 
      value: institutions.length, 
      desc: 'Registered Madrasas pending review',
      icon: <Building2 className="w-4 h-4" />, 
      color: 'gold' as const, 
      animDelay: 0 
    },
    { 
      label: t.kpi_pending_students,     
      value: students.length,     
      desc: 'Candidate submissions awaiting approval',
      icon: <Users className="w-4 h-4" />,     
      color: 'sapphire' as const, 
      animDelay: 100 
    },
    { 
      label: t.kpi_active_rounds,        
      value: rounds.length,       
      desc: 'Live competition rounds in progress',
      icon: <Trophy className="w-4 h-4" />,    
      color: 'emerald' as const,  
      animDelay: 200 
    },
    { 
      label: t.kpi_upcoming,             
      value: 0,                   
      desc: 'Upcoming scheduled call-ups',
      icon: <Bell className="w-4 h-4" />,      
      color: 'purple' as const,   
      animDelay: 300 
    },
  ]

  return (
    <div className="space-y-8">
      
      {/* Welcome Banner matching jamia-admin */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1a1512] via-[#004d29] to-[#006838] p-8 text-white shadow-lg">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-[#c99335]">
            <ShieldCheck className="w-3.5 h-3.5" /> Logged in as {role} ({claims?.name || 'Administrator'})
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
            Welcome to Musabaqa Admin CMS
          </h1>
          <p className="text-sm text-gray-200 leading-relaxed">
            Manage Madrasa institutions, contestant registrations, jury round assignments, real-time live scoring, and official results tabulation for Jamia Mosque Nairobi.
          </p>
        </div>
      </div>

      {/* Main Stat Cards Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Quick Action & Operational Panels matching jamia-admin */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Live Scoring */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-serif font-bold text-base">
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>Live Scoring Feed</span>
            </div>
            <p className="text-xs text-gray-500">
              Broadcast and monitor live Tajweed & Hifdh scoring evaluations in real-time.
            </p>
          </div>
          <div className="pt-5">
            <Link
              href={`/${locale}/dashboard/live`}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-[#006838] hover:bg-[#007c43] text-white rounded-md transition-colors"
            >
              <span>Open Live Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Institution Reviews */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-base">
              <Building2 className="w-4 h-4 text-[#c99335]" />
              <span>Institution Roster</span>
            </div>
            <p className="text-xs text-gray-500">
              Review, approve, or reject participating Madrasas and Islamic academies.
            </p>
          </div>
          <div className="pt-5">
            <Link
              href={`/${locale}/dashboard/institutions`}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-[#1a1512] hover:bg-stone-800 text-white rounded-md transition-colors"
            >
              <span>Manage Institutions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Official Reports */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-sky-500 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-900 font-serif font-bold text-base">
              <FileBarChart className="w-4 h-4 text-sky-600" />
              <span>Reports & Exports</span>
            </div>
            <p className="text-xs text-gray-500">
              Generate printable result dossiers, Excel score breakdowns, and audit records.
            </p>
          </div>
          <div className="pt-5">
            <Link
              href={`/${locale}/dashboard/reports`}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-md transition-colors"
            >
              <span>Generate Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Review Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending Institutions List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#c99335]" />
              <h2 className="font-serif font-bold text-sm text-gray-900">
                {dict.institutions.filter_pending} {dict.nav.institutions} ({institutions.length})
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/institutions`}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-4">
            {institutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-1.5">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
                <p className="text-xs font-medium text-gray-600">All caught up — no pending institutions</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {institutions.slice(0, 5).map(i => (
                  <div key={i.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{i.name}</span>
                    <span className="badge-pending">{dict.common.status_pending}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Rounds List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <h2 className="font-serif font-bold text-sm text-gray-900">
                {dict.rounds.status_active} {dict.nav.rounds} ({rounds.length})
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/rounds`}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-4">
            {rounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-1.5">
                <Clock className="w-7 h-7 text-amber-500" />
                <p className="text-xs font-medium text-gray-600">No active rounds in session currently</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rounds.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <span className="text-sm font-medium text-gray-800">
                      Round #{r.id} — {r.round_type}
                    </span>
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
