'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  variant?: 'default' | 'danger' | 'warning' | 'success'
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
}

const variantStyles = {
  default: {
    titleColor: '#f0f0ff',
    accentBar:  'linear-gradient(90deg, rgba(91,141,245,0.8), rgba(91,141,245,0.2))',
    iconBg:     'rgba(91,141,245,0.15)',
    iconColor:  '#5b8df5',
  },
  danger: {
    titleColor: '#f56b7e',
    accentBar:  'linear-gradient(90deg, rgba(245,107,126,0.8), rgba(245,107,126,0.2))',
    iconBg:     'rgba(245,107,126,0.12)',
    iconColor:  '#f56b7e',
  },
  warning: {
    titleColor: '#f0c060',
    accentBar:  'linear-gradient(90deg, rgba(240,192,96,0.8), rgba(240,192,96,0.2))',
    iconBg:     'rgba(240,192,96,0.12)',
    iconColor:  '#f0c060',
  },
  success: {
    titleColor: '#00d88a',
    accentBar:  'linear-gradient(90deg, rgba(0,216,138,0.8), rgba(0,216,138,0.2))',
    iconBg:     'rgba(0,216,138,0.12)',
    iconColor:  '#00d88a',
  },
}

const maxWidths = { sm: '28rem', md: '36rem', lg: '48rem' }

export default function Modal({ isOpen, onClose, title, variant = 'default', children, maxWidth = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const styles = variantStyles[variant]

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(4,4,12,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="w-full relative animate-[scale-in_0.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
        style={{
          maxWidth: maxWidths[maxWidth],
          background: 'linear-gradient(135deg, #111120 0%, #0c0c1a 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1.5rem',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          animation: 'modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.9) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Top accent bar */}
        <div
          className="absolute top-0 left-8 right-8 h-px rounded-full"
          style={{ background: styles.accentBar }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: styles.iconBg, border: `1px solid ${styles.iconColor}22` }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: styles.iconColor, boxShadow: `0 0 8px ${styles.iconColor}` }} />
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: styles.titleColor, fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(160,160,192,0.7)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'
              ;(e.currentTarget as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(160,160,192,0.7)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="divider mx-7" />

        {/* Body */}
        <div className="px-7 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}
