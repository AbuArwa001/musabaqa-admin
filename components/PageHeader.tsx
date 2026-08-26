interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  badge?: { label: string; color?: 'gold' | 'emerald' | 'sapphire' | 'rose' }
}

export default function PageHeader({ title, subtitle, actions, badge }: PageHeaderProps) {
  const badgeColors = {
    gold:     'bg-amber-50 text-amber-800 border-amber-200',
    emerald:  'bg-emerald-50 text-emerald-800 border-emerald-200',
    sapphire: 'bg-sky-50 text-sky-800 border-sky-200',
    rose:     'bg-rose-50 text-rose-800 border-rose-200',
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeColors[badge.color ?? 'gold']}`}>
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-500">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
