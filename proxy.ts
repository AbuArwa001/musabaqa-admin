import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['en', 'ar']
const DEFAULT_LOCALE = 'en'
const COOKIE_NAME = 'musabaqa_admin_token'

function getLocale(req: NextRequest): string {
  const accept = req.headers.get('accept-language') || ''
  if (accept.toLowerCase().includes('ar')) return 'ar'
  return DEFAULT_LOCALE
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) return

  // Locale redirect
  const hasLocale = LOCALES.some(loc => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`))
  if (!hasLocale) {
    const locale = getLocale(req)
    req.nextUrl.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(req.nextUrl)
  }

  // Auth guard — protect everything under /[locale]/ except /login
  const locale = LOCALES.find(loc => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) || DEFAULT_LOCALE
  const isLogin = pathname === `/${locale}/login` || pathname === `/${locale}/login/`
  if (!isLogin) {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      const loginUrl = new URL(`/${locale}/login`, req.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)', '/'],
}
