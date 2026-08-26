interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  badge?: { label: string; color?: 'gold' | 'emerald' | 'sapphire' | 'rose' }
}

export default function PageHeader({ title, subtitle, actions, badge }: PageHeaderProps) {
  const badgeColors = {
    gold:     'bg-[rgba(240,192,96,0.1)] text-[#f0c060] border-[rgba(240,192,96,0.25)]',
    emerald:  'bg-[rgba(0,216,138,0.1)] text-[#00d88a] border-[rgba(0,216,138,0.25)]',
    sapphire: 'bg-[rgba(91,141,245,0.1)] text-[#5b8df5] border-[rgba(91,141,245,0.25)]',
    rose:     'bg-[rgba(245,107,126,0.1)] text-[#f56b7e] border-[rgba(245,107,126,0.25)]',
  }

  return (
    <div className="flex items-start justify-between gap-4 mb-8 animate-fade-slide-up">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.65) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </h1>
          {badge && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border uppercase tracking-widest ${badgeColors[badge.color ?? 'gold']}`}>
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm" style={{ color: 'rgba(160,160,192,0.7)' }}>
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
