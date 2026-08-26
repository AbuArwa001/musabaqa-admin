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
    titleColor: 'text-gray-900',
    dotBg: 'bg-emerald-600',
  },
  danger: {
    titleColor: 'text-rose-900',
    dotBg: 'bg-rose-600',
  },
  warning: {
    titleColor: 'text-amber-900',
    dotBg: 'bg-amber-600',
  },
  success: {
    titleColor: 'text-emerald-900',
    dotBg: 'bg-emerald-600',
  },
}

const maxWidths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={`w-full ${maxWidths[maxWidth]} bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-[scale-in_0.2s_ease-out]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${styles.dotBg}`} />
            <h2 className={`font-serif text-lg font-bold ${styles.titleColor}`}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
