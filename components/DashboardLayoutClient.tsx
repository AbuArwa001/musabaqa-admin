'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Languages, Menu, ChevronLeft, ChevronRight } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import SessionTimer from '@/components/SessionTimer'

export default function DashboardLayoutClient({
  children,
  locale,
  dict,
  role,
  userName,
  exp,
  isAr,
  otherLocale,
}: {
  children: React.ReactNode
  locale: string
  dict: any
  role: any
  userName: string
  exp?: number
  isAr: boolean
  otherLocale: string
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className={`flex h-screen bg-gray-50 overflow-hidden font-sans ${isAr ? 'flex-row-reverse' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <div className={`fixed inset-y-0 z-50 transition-all duration-300 md:relative md:flex ${
        isMobileOpen ? 'translate-x-0' : isAr ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${isSidebarCollapsed ? 'w-20' : 'w-64'} ${isAr ? 'border-l' : 'border-r'} border-[#2d2520]`}>
        <Sidebar 
          locale={locale} 
          dict={dict} 
          role={role} 
          userName={userName} 
          isCollapsed={isSidebarCollapsed} 
          onCloseMobile={() => setIsMobileOpen(false)} 
        />
        
        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden md:flex absolute top-6 ${isAr ? '-left-3' : '-right-3'} w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-500 hover:text-emerald-600 shadow-md z-50 cursor-pointer transition-transform hover:scale-110`}
        >
          {isSidebarCollapsed 
            ? (isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />) 
            : (isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />)}
        </button>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative min-w-0">
        {/* Top Header Navbar */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <span className="hidden sm:block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
            <h2 className="font-serif text-sm sm:text-base font-bold text-gray-900 truncate">
              Jamia Mosque CMS
            </h2>
          </div>

          <div className={`flex items-center gap-2 sm:gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
            {/* Live Token Expiration Countdown Timer */}
            {exp && (
              <div className="hidden sm:block">
                <SessionTimer tokenExp={exp} locale={locale} />
              </div>
            )}

            {/* Language Switcher */}
            <Link
              href={`/${otherLocale}/dashboard`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">{isAr ? 'English' : 'العربية'}</span>
            </Link>

            <div className="text-[10px] sm:text-xs text-gray-500 font-medium hidden lg:block bg-gray-50 px-2 py-1 rounded border">
              API: <code className="text-emerald-700 font-mono font-bold">musabaqa-api</code>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
